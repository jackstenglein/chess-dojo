/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { IDBPDatabase, openDB } from 'idb';

/**
 * A interface that represents a ChessDb move
 */
export interface ChessDbMove {
    /**
     * uci of the move
     */
    uci: string;
    /**
     * san of the move
     */
    san: string;
    /**
     * raw eval in string format
     */
    score: string;
    /**
     * win rate for this move
     */
    winrate: string;
    /**
     * ChessDB's rank of this move
     */
    rank: string;
    /**
     * ChessDB's note for this move
     */
    note: string;
}

/**
 * A interface that represents ChessDb PV (variation)
 */
export interface ChessDbPv {
    /**
     * raw eval in string format
     */
    score: number;
    /**
     * the depth of this variation
     */
    depth: number;
    /**
     * list of uci moves for this variation
     */
    pv: string[];
    /**
     * list of san moves for this variation
     */
    pvSAN: string[];
}

/**
 * A interface that represents ChessDB cache object,
 * it contains both chessDb move and variation
 */
export interface ChessDbCacheEntry {
    moves?: ChessDbMove[];
    pv?: ChessDbPv;
}

const DB_NAME = 'chessDB';
const STORE_NAME = 'positions';
const META_STORE_NAME = 'meta';
const DB_VERSION = 2;

/** Maximum total byte size of all cached ChessDB entries before eviction triggers. */
const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Fraction of entries (by count, oldest-first) removed during a normal eviction pass.
 * A second aggressive pass uses 3× this value on QuotaExceededError.
 */
const EVICTION_FRACTION = 0.2;

/** Metadata stored alongside each cached position for LRU tracking. */
interface MetaRecord {
    /** Unix timestamp (ms) of the last read or write for this entry. */
    lastAccessedAt: number;
    /** Byte size of the corresponding {@link ChessDbCacheEntry} as JSON-encoded UTF-8. */
    sizeBytes: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Returns a singleton IDBPDatabase promise, opening (and upgrading) the database
 * on the first call. Version 2 adds the `meta` object store for LRU tracking.
 */
function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                if (oldVersion < 2 && !db.objectStoreNames.contains(META_STORE_NAME)) {
                    db.createObjectStore(META_STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
}

/**
 * Measures the byte size of a {@link ChessDbCacheEntry} as it would be stored —
 * by JSON-serialising the object and counting UTF-8 bytes via TextEncoder.
 */
function measureBytes(entry: ChessDbCacheEntry): number {
    return new TextEncoder().encode(JSON.stringify(entry)).byteLength;
}

/**
 * Updates (or creates) the LRU metadata record for a given FEN key.
 * Called on both cache reads (to refresh the timestamp) and writes (to set initial size).
 */
async function touchMeta(db: IDBPDatabase, fen: string, sizeBytes: number): Promise<void> {
    const record: MetaRecord = { lastAccessedAt: Date.now(), sizeBytes };
    await db.put(META_STORE_NAME, record, fen);
}

/**
 * Evicts the oldest `fraction` of entries from the IDB cache.
 * Entries are ranked by `lastAccessedAt` ascending (oldest first).
 * Both the position record and its metadata record are removed atomically.
 *
 * @param db - The open IDBPDatabase instance.
 * @param fraction - Fraction of total entries to remove, e.g. `0.2` removes the oldest 20%.
 */
async function evict(db: IDBPDatabase, fraction: number): Promise<void> {
    const allKeys = (await db.getAllKeys(META_STORE_NAME)) as string[];
    const allMeta = await Promise.all(
        allKeys.map((k) => db.get(META_STORE_NAME, k) as Promise<MetaRecord>),
    );

    const entries = allKeys
        .map((key, i) => ({ key, meta: allMeta[i] }))
        .filter((e) => e.meta != null)
        .sort((a, b) => a.meta.lastAccessedAt - b.meta.lastAccessedAt);

    const count = Math.max(1, Math.ceil(entries.length * fraction));
    const toEvict = entries.slice(0, count);

    const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
    await Promise.all(
        toEvict.flatMap(({ key }) => [
            tx.objectStore(STORE_NAME).delete(key),
            tx.objectStore(META_STORE_NAME).delete(key),
        ]),
    );
    await tx.done;

    const evictedBytes = toEvict.reduce((sum, { meta }) => sum + (meta?.sizeBytes ?? 0), 0);
    console.info(
        `[chessDbCache] Evicted ${toEvict.length} entries (${(evictedBytes / 1024).toFixed(1)} KB).`,
    );
}

/**
 * Evicts the oldest {@link EVICTION_FRACTION} of entries if adding `incomingBytes`
 * would push total tracked usage over {@link MAX_CACHE_BYTES}.
 *
 * @param db - The open IDBPDatabase instance.
 * @param incomingBytes - Byte size of the entry about to be written.
 */
async function evictIfNeeded(db: IDBPDatabase, incomingBytes: number): Promise<void> {
    const allMeta = (await db.getAll(META_STORE_NAME)) as MetaRecord[];
    const totalBytes = allMeta.reduce((sum, m) => sum + (m?.sizeBytes ?? 0), 0);
    if (totalBytes + incomingBytes <= MAX_CACHE_BYTES) return;
    await evict(db, EVICTION_FRACTION);
}

/**
 * Retrieves a cached ChessDB entry (moves and/or PV) for the given FEN.
 * Updates the LRU timestamp on hit so recently-read entries are evicted last.
 *
 * @param fen - The FEN string identifying the position.
 * @returns The cached {@link ChessDbCacheEntry}, or `undefined` on a cache miss.
 */
export async function getChessDbCache(fen: string): Promise<ChessDbCacheEntry | undefined> {
    const db = await getDb();
    const value = (await db.get(STORE_NAME, fen)) as ChessDbCacheEntry | undefined;
    if (value) {
        void touchMeta(db, fen, measureBytes(value));
    }
    return value;
}

/**
 * Persists move data for a position, merging with any existing PV already cached.
 *
 * Before writing:
 *  1. Measures the exact byte size of the merged entry via JSON + TextEncoder.
 *  2. Evicts the oldest {@link EVICTION_FRACTION} of entries if the write would
 *     push total tracked usage over {@link MAX_CACHE_BYTES}.
 *
 * If the browser throws `QuotaExceededError`, a second aggressive eviction pass
 * (3× the normal fraction) is attempted before retrying. If that also fails the
 * error is swallowed — a cache miss is never fatal.
 *
 * @param fen - The FEN string identifying the position.
 * @param moves - The {@link ChessDbMove} array to cache.
 */
export async function setChessDbMovesCache(fen: string, moves: ChessDbMove[]): Promise<void> {
    const db = await getDb();
    const existing: ChessDbCacheEntry = (await db.get(STORE_NAME, fen)) ?? {};
    const merged: ChessDbCacheEntry = { ...existing, moves };
    const sizeBytes = measureBytes(merged);

    try {
        await evictIfNeeded(db, sizeBytes);
        await db.put(STORE_NAME, merged, fen);
        await touchMeta(db, fen, sizeBytes);
    } catch (err) {
        if ((err as DOMException)?.name === 'QuotaExceededError') {
            console.warn(
                '[chessDbCache] QuotaExceededError — forcing aggressive eviction and retrying.',
            );
            try {
                await evict(db, EVICTION_FRACTION * 3);
                await db.put(STORE_NAME, merged, fen);
                await touchMeta(db, fen, sizeBytes);
            } catch (retryErr) {
                console.error(
                    '[chessDbCache] Could not store moves after aggressive eviction:',
                    retryErr,
                );
            }
        } else {
            throw err;
        }
    }
}

/**
 * Persists PV (principal variation) data for a position, merging with any existing
 * moves already cached.
 *
 * Before writing:
 *  1. Measures the exact byte size of the merged entry via JSON + TextEncoder.
 *  2. Evicts the oldest {@link EVICTION_FRACTION} of entries if the write would
 *     push total tracked usage over {@link MAX_CACHE_BYTES}.
 *
 * If the browser throws `QuotaExceededError`, a second aggressive eviction pass
 * (3× the normal fraction) is attempted before retrying. If that also fails the
 * error is swallowed — a cache miss is never fatal.
 *
 * @param fen - The FEN string identifying the position.
 * @param pv - The {@link ChessDbPv} object to cache.
 */
export async function setChessDbPvCache(fen: string, pv: ChessDbPv): Promise<void> {
    const db = await getDb();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const existing: ChessDbCacheEntry = (await db.get(STORE_NAME, fen)) ?? {};
    const merged: ChessDbCacheEntry = { ...existing, pv };
    const sizeBytes = measureBytes(merged);
    await evictIfNeeded(db, sizeBytes);
    await db.put(STORE_NAME, merged, fen);
    await touchMeta(db, fen, sizeBytes);
}
