import { logger } from '@/logging/logger';

/**
 * Persistent cache for Stockfish worker scripts and wasm.
 * Bump the name when those binaries change and the server does not send a new ETag.
 */
export const ENGINE_CACHE_NAME = 'chess-dojo-engine-v1';

export const SF18_JS = '/static/engine/sf18.js';
export const SF18_WASM = '/static/engine/sf18.wasm';
export const SF19_JS = '/static/engine/stockfish-19.js';
export const SF19_WASM = '/static/engine/stockfish-19.wasm';

const modules = new Map<string, Promise<WebAssembly.Module>>();
const scripts = new Map<string, Promise<string>>();
const revalidated = new Set<string>();

export function absoluteEngineUrl(path: string): string {
    return new URL(path, window.location.origin).href;
}

/**
 * Returns the wasm bytes, reading them from the Cache API after the first download.
 * Each call reads a new buffer so the caller can transfer it to a worker.
 */
export async function loadCachedBytes(path: string): Promise<ArrayBuffer> {
    const url = absoluteEngineUrl(path);
    const cache = await openCache();
    const cached = cache ? await cache.match(url) : undefined;

    if (cached) {
        logger.debug(`Engine asset cache hit: ${url}`);
        scheduleRevalidate(cache, url, cached);
        return cached.arrayBuffer();
    }

    logger.debug(`Engine asset cache miss: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    if (cache) {
        try {
            await cache.put(url, response.clone());
        } catch (err) {
            logger.warn(`Failed to cache engine asset ${url}`, err);
        }
    }

    return response.arrayBuffer();
}

/** Returns the engine script text, memoized for the rest of the page session. */
export function loadCachedScript(path: string): Promise<string> {
    const url = absoluteEngineUrl(path);
    const existing = scripts.get(url);
    if (existing) return existing;

    const pending = loadCachedBytes(path).then((bytes) => new TextDecoder().decode(bytes));
    scripts.set(url, pending);
    pending.catch(() => {
        if (scripts.get(url) === pending) scripts.delete(url);
    });
    return pending;
}

/**
 * Compiles the wasm once per page session. Later calls reuse the compiled module
 * so turning the engine on again does not download or compile it.
 */
export function loadCachedWasmModule(path: string): Promise<WebAssembly.Module> {
    const url = absoluteEngineUrl(path);
    const existing = modules.get(url);
    if (existing) return existing;

    const pending = loadCachedBytes(path).then((bytes) => WebAssembly.compile(bytes));
    modules.set(url, pending);
    pending.catch(() => {
        if (modules.get(url) === pending) modules.delete(url);
    });
    return pending;
}

/** A compiled module produced inside a worker, kept for the next engine start. */
export function rememberWasmModule(path: string, wasmModule: WebAssembly.Module): void {
    modules.set(absoluteEngineUrl(path), Promise.resolve(wasmModule));
}

/** The compiled module from an earlier start in this page, if it is ready or in flight. */
export function getRememberedWasmModule(path: string): Promise<WebAssembly.Module> | undefined {
    return modules.get(absoluteEngineUrl(path));
}

/** Clears in-memory entries. Tests use this so cases do not share cache state. */
export function resetEngineAssetCacheForTests(): void {
    modules.clear();
    scripts.clear();
    revalidated.clear();
}

async function openCache(): Promise<Cache | undefined> {
    if (typeof caches === 'undefined') return undefined;
    try {
        return await caches.open(ENGINE_CACHE_NAME);
    } catch (err) {
        logger.warn?.('Engine cache unavailable', err);
        return undefined;
    }
}

function scheduleRevalidate(cache: Cache | undefined, url: string, cached: Response): void {
    if (!cache || revalidated.has(url)) return;
    revalidated.add(url);

    const etag = cached.headers.get('etag');
    const lastModified = cached.headers.get('last-modified');
    if (!etag && !lastModified) return;

    void revalidate(cache, url, etag, lastModified).catch((err) => {
        logger.warn?.(`Failed to revalidate engine asset ${url}`, err);
    });
}

async function revalidate(
    cache: Cache,
    url: string,
    etag: string | null,
    lastModified: string | null,
): Promise<void> {
    const headers = new Headers();
    if (etag) headers.set('If-None-Match', etag);
    if (lastModified) headers.set('If-Modified-Since', lastModified);

    const fresh = await fetch(url, { headers, cache: 'no-store' });
    if (fresh.status === 304) return;

    const newEtag = fresh.headers.get('etag');
    if (!fresh.ok || !newEtag || newEtag === etag) return;

    await cache.put(url, fresh);
    modules.delete(url);
    scripts.delete(url);
    logger.debug?.(`Updated cached engine asset ${url}`);
}
