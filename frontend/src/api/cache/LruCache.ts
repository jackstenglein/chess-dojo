import { IDBPDatabase, openDB } from 'idb';

export interface LruCacheOptions {
    dbName: string;
    storeName: string;
    metaStoreName: string;
    dbVersion: number;
    maxCacheBytes: number;
    evictionFraction: number;
    /** Called when the DB needs to be upgraded. Responsible for creating object stores. */
    onUpgrade?: (db: IDBPDatabase, oldVersion: number) => void;
    /** Optional logger; defaults to console. */
    logger?: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;
}

export interface MetaRecord {
    /** Unix timestamp (ms) of the last read or write for this entry. */
    lastAccessedAt: number;
    /** Byte size of the corresponding entry as JSON-encoded UTF-8. */
    sizeBytes: number;
}

/**
 * Measures the byte size of a value as it would be stored —
 * by JSON-serialising the object and counting UTF-8 bytes via TextEncoder.
 */
export function measureBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

/**
 * A generic LRU cache backed by IndexedDB.
 *
 * Entries are tracked by a separate `meta` store containing last-access
 * timestamps and byte sizes. When the total tracked size would exceed
 * `maxCacheBytes`, the oldest `evictionFraction` of entries are removed
 * atomically before the new entry is written.
 */
export class LruCache<T> {
    private dbPromise: Promise<IDBPDatabase> | null = null;
    private readonly opts: LruCacheOptions;
    private readonly log: Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

    constructor(opts: LruCacheOptions) {
        this.opts = opts;
        this.log = opts.logger ?? console;
    }

    // ─── DB bootstrap ────────────────────────────────────────────────────────

    getDb(): Promise<IDBPDatabase> {
        if (!this.dbPromise) {
            const { dbName, dbVersion, storeName, metaStoreName, onUpgrade } = this.opts;
            this.dbPromise = openDB(dbName, dbVersion, {
                upgrade(db, oldVersion) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                    if (!db.objectStoreNames.contains(metaStoreName)) {
                        db.createObjectStore(metaStoreName);
                    }
                    onUpgrade?.(db, oldVersion);
                },
            });
        }
        return this.dbPromise;
    }

    // ─── Meta / LRU helpers ──────────────────────────────────────────────────

    /** Updates (or creates) the LRU metadata record for a given cache key. */
    async touchMeta(db: IDBPDatabase, key: string, sizeBytes: number): Promise<void> {
        const record: MetaRecord = { lastAccessedAt: Date.now(), sizeBytes };
        await db.put(this.opts.metaStoreName, record, key);
    }

    /**
     * Evicts the oldest `fraction` of entries from the IDB cache.
     * Both the data record and its metadata record are removed atomically.
     */
    async evict(db: IDBPDatabase, fraction: number): Promise<void> {
        const { storeName, metaStoreName } = this.opts;

        const allKeys = (await db.getAllKeys(metaStoreName)) as string[];
        const allMeta = await Promise.all(
            allKeys.map((k) => db.get(metaStoreName, k) as Promise<MetaRecord>),
        );

        const entries = allKeys
            .map((key, i) => ({ key, meta: allMeta[i] }))
            .filter((e) => e.meta != null)
            .sort((a, b) => a.meta.lastAccessedAt - b.meta.lastAccessedAt);

        const count = Math.max(1, Math.ceil(entries.length * fraction));
        const toEvict = entries.slice(0, count);

        const tx = db.transaction([storeName, metaStoreName], 'readwrite');
        await Promise.all(
            toEvict.flatMap(({ key }) => [
                tx.objectStore(storeName).delete(key),
                tx.objectStore(metaStoreName).delete(key),
            ]),
        );
        await tx.done;

        const evictedBytes = toEvict.reduce((sum, { meta }) => sum + (meta?.sizeBytes ?? 0), 0);
        this.log.debug(
            `[${this.opts.dbName}] Evicted ${toEvict.length} entries (${(evictedBytes / 1024).toFixed(1)} KB).`,
        );
    }

    /**
     * Evicts the oldest `evictionFraction` of entries if adding `incomingBytes`
     * would push total tracked usage over `maxCacheBytes`.
     */
    async evictIfNeeded(db: IDBPDatabase, incomingBytes: number): Promise<void> {
        const allMeta = (await db.getAll(this.opts.metaStoreName)) as MetaRecord[];
        const totalBytes = allMeta.reduce((sum, m) => sum + (m?.sizeBytes ?? 0), 0);
        if (totalBytes + incomingBytes <= this.opts.maxCacheBytes) return;
        await this.evict(db, this.opts.evictionFraction);
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Retrieves a cached entry by key.
     * Updates the LRU timestamp on hit so recently-read entries are evicted last.
     */
    async get(key: string): Promise<T | undefined> {
        const db = await this.getDb();
        const value = (await db.get(this.opts.storeName, key)) as T | undefined;
        if (value) {
            void this.touchMeta(db, key, measureBytes(value));
        }
        return value;
    }

    /**
     * Persists an entry to the cache.
     *
     * Before writing:
     *  1. Measures the exact byte size via JSON + TextEncoder.
     *  2. Evicts the oldest `evictionFraction` of entries if the write would
     *     push total tracked usage over `maxCacheBytes`.
     *
     * If the browser throws `QuotaExceededError`, a second aggressive eviction
     * pass (3× the normal fraction) is attempted before retrying. If that also
     * fails the error is swallowed — a cache miss is never fatal.
     */
    async set(key: string, value: T): Promise<void> {
        const db = await this.getDb();
        const sizeBytes = measureBytes(value);

        try {
            await this.evictIfNeeded(db, sizeBytes);
            await db.put(this.opts.storeName, value, key);
            await this.touchMeta(db, key, sizeBytes);
        } catch (err) {
            if ((err as DOMException)?.name === 'QuotaExceededError') {
                this.log.warn(
                    `[${this.opts.dbName}] QuotaExceededError — forcing aggressive eviction and retrying.`,
                );
                try {
                    await this.evict(db, this.opts.evictionFraction * 3);
                    await db.put(this.opts.storeName, value, key);
                    await this.touchMeta(db, key, sizeBytes);
                } catch (retryErr) {
                    this.log.error(
                        `[${this.opts.dbName}] Could not store entry after aggressive eviction:`,
                        retryErr,
                    );
                }
            } else {
                throw err;
            }
        }
    }
}
