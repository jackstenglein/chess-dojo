import { logger } from '@/logging/logger';
import { LruCache, measureBytes } from './LruCache';

/**
 * A interface that represents a ChessDb move
 */
export interface ChessDbMove {
    /** uci of the move */
    uci: string;
    /** san of the move */
    san: string;
    /** raw eval in string format */
    score: string;
    /** win rate for this move */
    winrate: string;
    /** ChessDB's rank of this move */
    rank: number;
    /** ChessDB's note for this move */
    note: string;
}

/**
 * A interface that represents ChessDb PV (variation)
 */
export interface ChessDbPv {
    /** The starting FEN of the pv. */
    fen: string;
    /** raw eval in string format */
    score: number;
    /** the depth of this variation */
    depth: number;
    /** list of uci moves for this variation */
    pv: string[];
    /** list of san moves for this variation */
    pvSAN: string[];
}

/**
 * An interface that represents ChessDB cache entry.
 * It contains both chessDb move and variation
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
 * A second aggressive pass uses 3x this value on QuotaExceededError.
 */
const EVICTION_FRACTION = 0.2;

const chessDbCache = new LruCache<ChessDbCacheEntry>({
    dbName: DB_NAME,
    storeName: STORE_NAME,
    metaStoreName: META_STORE_NAME,
    dbVersion: DB_VERSION,
    maxCacheBytes: MAX_CACHE_BYTES,
    evictionFraction: EVICTION_FRACTION,
    logger,
});

/**
 * Retrieves a cached ChessDB entry (moves and/or PV) for the given FEN.
 * Updates the LRU timestamp on hit so recently-read entries are evicted last.
 *
 * @param fen - The FEN string identifying the position.
 * @returns The cached {@link ChessDbCacheEntry}, or `undefined` on a cache miss.
 */
export async function getChessDbCache(fen: string): Promise<ChessDbCacheEntry | undefined> {
    return chessDbCache.get(fen);
}

/**
 * Persists a chess DB cache entry, merging with any existing entry already cached.
 *
 * Before writing:
 *  1. Measures the exact byte size of the merged entry via JSON + TextEncoder.
 *  2. Evicts the oldest {@link EVICTION_FRACTION} of entries if the write would
 *     push total tracked usage over {@link MAX_CACHE_BYTES}.
 *
 * If the browser throws `QuotaExceededError`, a second aggressive eviction pass
 * (3x the normal fraction) is attempted before retrying. If that also fails the
 * error is swallowed — a cache miss is never fatal.
 *
 * @param fen - The FEN string identifying the position.
 * @param entry - The {@link ChessDbCacheEntry} to cache.
 */
export async function setChessDbCacheEntry(fen: string, entry: ChessDbCacheEntry): Promise<void> {
    const db = await chessDbCache.getDb();
    const existing = ((await db.get(STORE_NAME, fen)) as ChessDbCacheEntry) ?? {};
    const merged: ChessDbCacheEntry = { ...existing, ...entry };
    const sizeBytes = measureBytes(merged);

    try {
        await chessDbCache.evictIfNeeded(db, sizeBytes);
        await db.put(STORE_NAME, merged, fen);
        await chessDbCache.touchMeta(db, fen, sizeBytes);
    } catch (err) {
        if ((err as DOMException)?.name === 'QuotaExceededError') {
            logger.warn(
                '[chessDbCache] QuotaExceededError — forcing aggressive eviction and retrying.',
            );
            try {
                await chessDbCache.evict(db, EVICTION_FRACTION * 3);
                await db.put(STORE_NAME, merged, fen);
                await chessDbCache.touchMeta(db, fen, sizeBytes);
            } catch (retryErr) {
                logger.error(
                    '[chessDbCache] Could not store moves after aggressive eviction:',
                    retryErr,
                );
            }
        } else {
            throw err;
        }
    }
}
