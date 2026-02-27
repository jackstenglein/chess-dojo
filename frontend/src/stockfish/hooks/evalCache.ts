/* eslint-disable no-console */
import { openDB, IDBPDatabase } from 'idb';
import { EngineName, SavedEval } from '../engine/engine';

const DB_NAME = 'stockfishEngineEvals';
const STORE_NAME = 'evals';
const META_STORE_NAME = 'meta';
const DB_VERSION = 2;


const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 50 MB

const EVICTION_FRACTION = 0.2;


let dbPromise: Promise<IDBPDatabase> | null = null;

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


interface MetaRecord {
    lastAccessedAt: number;
    /** Byte size measured from the actual stored JSON of the SavedEval. */
    sizeBytes: number;
}


export function makeEvalCacheKey(fen: string, engineName: EngineName): string {
    return `${fen}|${engineName}`;
}


/**
 * Measures the byte size of a SavedEval as it would actually be stored —
 * by JSON-serialising the object and counting UTF-8 bytes via TextEncoder.
 * This mirrors how IndexedDB structured-clone serialises ASCII-heavy chess data.
 */
function measureBytes(eval_: SavedEval): number {
    return new TextEncoder().encode(JSON.stringify(eval_)).byteLength;
}


/** Updates (or creates) the LRU metadata record for a given cache key. */
async function touchMeta(db: IDBPDatabase, key: string, sizeBytes: number): Promise<void> {
    const record: MetaRecord = { lastAccessedAt: Date.now(), sizeBytes };
    await db.put(META_STORE_NAME, record, key);
}


/**
 * Evicts the oldest `fraction` of entries from the IDB cache.
 * Entries are ranked by `lastAccessedAt` ascending (oldest first).
 * Both the eval record and its metadata record are removed atomically.
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
        `[evalCache] Evicted ${toEvict.length} entries (${(evictedBytes / 1024).toFixed(1)} KB).`,
    );
}

/**
 * Evicts the oldest EVICTION_FRACTION of entries if adding `incomingBytes`
 * would push total tracked usage over MAX_CACHE_BYTES.
 */
async function evictIfNeeded(db: IDBPDatabase, incomingBytes: number): Promise<void> {
    const allMeta = (await db.getAll(META_STORE_NAME)) as MetaRecord[];
    const totalBytes = allMeta.reduce((sum, m) => sum + (m?.sizeBytes ?? 0), 0);
    if (totalBytes + incomingBytes <= MAX_CACHE_BYTES) return;
    await evict(db, EVICTION_FRACTION);
}


/**
 * Retrieves a cached eval from IndexedDB.
 * Updates the LRU timestamp on hit so recently-read entries are evicted last.
 */
export async function getEvalCache(key: string): Promise<SavedEval | undefined> {
    const db = await getDb();
    const value = (await db.get(STORE_NAME, key)) as SavedEval | undefined;
    if (value) {
        void touchMeta(db, key, measureBytes(value));
    }
    return value;
}

/**
 * Persists a completed eval to IndexedDB.
 *
 * Before writing:
 *  1. Measures the exact byte size of the incoming eval via JSON + TextEncoder.
 *  2. Evicts the oldest EVICTION_FRACTION of entries if the new entry would
 *     push total tracked usage over MAX_CACHE_BYTES.
 *
 * If the browser itself throws QuotaExceededError (e.g. the user's disk is
 * nearly full), a second aggressive eviction pass (3× the normal fraction) is
 * attempted before retrying. If that also fails the error is swallowed —
 * a cache miss is never fatal.
 */
export async function setEvalCache(key: string, eval_: SavedEval): Promise<void> {
    const db = await getDb();
    const sizeBytes = measureBytes(eval_);

    try {
        await evictIfNeeded(db, sizeBytes);
        await db.put(STORE_NAME, eval_, key);
        await touchMeta(db, key, sizeBytes);
    } catch (err) {
        if ((err as DOMException)?.name === 'QuotaExceededError') {
            console.warn('[evalCache] QuotaExceededError — forcing aggressive eviction and retrying.');
            try {
                await evict(db, EVICTION_FRACTION * 3);
                await db.put(STORE_NAME, eval_, key);
                await touchMeta(db, key, sizeBytes);
            } catch (retryErr) {
                console.error('[evalCache] Could not store eval after aggressive eviction:', retryErr);
            }
        } else {
            throw err;
        }
    }
}

/**
 * Clears all eval entries and their metadata from IndexedDB.
 * Useful for a "Clear engine cache" button in a settings panel.
 */
export async function clearEvalCache(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
    await Promise.all([
        tx.objectStore(STORE_NAME).clear(),
        tx.objectStore(META_STORE_NAME).clear(),
    ]);
    await tx.done;
}

/**
 * Returns a snapshot of cache health for use in a settings or debug UI.
 *
 * Fields:
 *  - `entryCount`     — number of cached positions currently stored
 *  - `estimatedBytes` — sum of measured sizes recorded in metadata
 *  - `maxBytes`       — the self-imposed cap (MAX_CACHE_BYTES)
 *  - `usedPercent`    — estimatedBytes / maxBytes × 100
 *  - `browserUsage`   — bytes used by this origin across all storage (Storage API), or null if unavailable
 *  - `browserQuota`   — total bytes available to this origin (Storage API), or null if unavailable
 *  - `maxEvalCount`   — estimated maximum number of evals storable, derived from:
 *                         min(MAX_CACHE_BYTES, 80% of remaining browser quota)
 *                         ÷ average measured size of existing entries
 *                       (falls back to 3072 B/entry when the cache is empty)
 */
export async function getEvalCacheStats(): Promise<{
    entryCount: number;
    estimatedBytes: number;
    maxBytes: number;
    usedPercent: number;
    browserUsage: number | null;
    browserQuota: number | null;
    maxEvalCount: number;
}> {
    const db = await getDb();
    const allKeys = (await db.getAllKeys(META_STORE_NAME)) as string[];
    const allMeta = (await db.getAll(META_STORE_NAME)) as MetaRecord[];

    const estimatedBytes = allMeta.reduce((sum, m) => sum + (m?.sizeBytes ?? 0), 0);
    const avgBytesPerEval = allMeta.length > 0 ? estimatedBytes / allMeta.length : 3072;

    let browserUsage: number | null = null;
    let browserQuota: number | null = null;
    let maxEvalCount = Math.floor(MAX_CACHE_BYTES / avgBytesPerEval);

    if (navigator?.storage?.estimate) {
        
            const estimate = await navigator.storage.estimate();
            browserUsage = estimate.usage ?? null;
            browserQuota = estimate.quota ?? null;
            if (browserQuota != null && browserUsage != null) {
                const remaining = browserQuota - browserUsage;
                const effectiveBudget = Math.min(MAX_CACHE_BYTES, remaining * 0.8);
                maxEvalCount = Math.max(0, Math.floor(effectiveBudget / avgBytesPerEval));
            }
       
    }

    return {
        entryCount: allKeys.length,
        estimatedBytes,
        maxBytes: MAX_CACHE_BYTES,
        usedPercent: (estimatedBytes / MAX_CACHE_BYTES) * 100,
        browserUsage,
        browserQuota,
        maxEvalCount,
    };
}