import { Script } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    absoluteEngineUrl,
    loadCachedBytes,
    loadCachedScript,
    loadCachedWasmModule,
    resetEngineAssetCacheForTests,
    SF18_JS,
} from './engineAssetCache';
import { bindStockfish19WasmPath, stockfish19WorkerPreamble } from './stockfish19WorkerShim';

const wasmBytes = Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);

function memoryCache() {
    const store = new Map<string, Response>();
    return {
        match(url: string) {
            const found = store.get(url);
            return Promise.resolve(found ? found.clone() : undefined);
        },
        put(url: string, response: Response) {
            store.set(url, response.clone());
            return Promise.resolve();
        },
        store,
    };
}

describe('engine asset cache', () => {
    const cache = memoryCache();

    beforeEach(() => {
        resetEngineAssetCacheForTests();
        cache.store.clear();
        vi.stubGlobal('caches', {
            open: vi.fn(() => Promise.resolve(cache)),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('reads sf18.js from the cache the second time', async () => {
        const fetches: RequestInit[] = [];
        vi.stubGlobal(
            'fetch',
            vi.fn((_url: string, init?: RequestInit) => {
                fetches.push(init ?? {});
                return Promise.resolve(
                    new Response('sf18-script', {
                        status: 200,
                        headers: { etag: '"sf18"' },
                    }),
                );
            }),
        );

        await expect(loadCachedScript(SF18_JS)).resolves.toBe('sf18-script');
        await expect(loadCachedScript(SF18_JS)).resolves.toBe('sf18-script');
        await vi.waitFor(() => expect(fetches.length).toBeGreaterThan(0));

        const downloads = fetches.filter((init) => !new Headers(init.headers).has('If-None-Match'));
        expect(downloads).toHaveLength(1);
        expect(cache.store.has(absoluteEngineUrl(SF18_JS))).toBe(true);
    });

    it('does not download wasm bytes again after they are cached', async () => {
        let downloads = 0;
        vi.stubGlobal(
            'fetch',
            vi.fn(() => {
                downloads += 1;
                return Promise.resolve(new Response(wasmBytes, { status: 200 }));
            }),
        );

        const first = await loadCachedBytes('/static/engine/stockfish-19.wasm');
        const second = await loadCachedBytes('/static/engine/stockfish-19.wasm');

        expect(new Uint8Array(first)).toEqual(wasmBytes);
        expect(new Uint8Array(second)).toEqual(wasmBytes);
        expect(downloads).toBe(1);
    });

    it('compiles a wasm module once per page session', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(new Response(wasmBytes, { status: 200 }))),
        );
        const compile = vi.spyOn(WebAssembly, 'compile');

        const first = await loadCachedWasmModule('/static/engine/sf18.wasm');
        const second = await loadCachedWasmModule('/static/engine/sf18.wasm');

        expect(first).toBe(second);
        expect(compile).toHaveBeenCalledTimes(1);
    });

    it('replaces a cached asset when revalidation returns a new etag', async () => {
        let etag = '"v1"';
        let body = 'first';
        const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
            const sent = new Headers(init?.headers).get('If-None-Match');
            if (sent) {
                if (sent === etag) return Promise.resolve(new Response(null, { status: 304 }));
                return Promise.resolve(new Response(body, { status: 200, headers: { etag } }));
            }
            return Promise.resolve(new Response(body, { status: 200, headers: { etag } }));
        });
        vi.stubGlobal('fetch', fetchMock);

        await expect(loadCachedScript('/static/engine/sf18.js')).resolves.toBe('first');
        resetEngineAssetCacheForTests();
        await expect(loadCachedScript('/static/engine/sf18.js')).resolves.toBe('first');
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

        etag = '"v2"';
        body = 'second';
        resetEngineAssetCacheForTests();
        await expect(loadCachedScript('/static/engine/sf18.js')).resolves.toBe('first');
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

        resetEngineAssetCacheForTests();
        await expect(loadCachedScript('/static/engine/sf18.js')).resolves.toBe('second');
    });
});

describe('stockfish 19 worker shim', () => {
    it('parses and points the loader at the wasm path when the hash is missing', () => {
        const preamble = stockfish19WorkerPreamble('stockfish-19.wasm');
        expect(() => new Script(preamble)).not.toThrow();

        const patched = bindStockfish19WasmPath(
            'e=self.location.hash.substr(1).split(","),u=decodeURIComponent(e[0]||"")',
            '/static/engine/stockfish-19.wasm',
        );
        expect(patched).toContain('"/static/engine/stockfish-19.wasm"');
        expect(patched).not.toContain('self.location.hash.substr(1).split(",")');
    });
});
