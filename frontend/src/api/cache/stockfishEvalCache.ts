import { EngineName, SavedEval } from '@/stockfish/engine/engine';
import { LruCache } from './LruCache';

const DB_NAME = 'stockfishEngineEvals';
const STORE_NAME = 'evals';
const META_STORE_NAME = 'meta';
const DB_VERSION = 2;

const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB
const EVICTION_FRACTION = 0.2;

const evalCache = new LruCache<SavedEval>({
    dbName: DB_NAME,
    storeName: STORE_NAME,
    metaStoreName: META_STORE_NAME,
    dbVersion: DB_VERSION,
    maxCacheBytes: MAX_CACHE_BYTES,
    evictionFraction: EVICTION_FRACTION,
});

export function makeEvalCacheKey(fen: string, engineName: EngineName): string {
    return `${fen}|${engineName}`;
}

/**
 * Retrieves a cached eval from IndexedDB.
 * Updates the LRU timestamp on hit so recently-read entries are evicted last.
 */
export async function getEvalCache(key: string): Promise<SavedEval | undefined> {
    return evalCache.get(key);
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
    return evalCache.set(key, eval_);
}
