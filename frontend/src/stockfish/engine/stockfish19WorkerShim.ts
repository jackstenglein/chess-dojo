/** Posted from the Stockfish 19 worker so the page can send cached wasm. */
export const ENGINE_CACHE_PORT = 'engine-cache-port';

/**
 * The minified Stockfish 19 loader reads the wasm URL from `location.hash`.
 * Keep the engine working when that hash is missing by substituting the known path.
 */
export function bindStockfish19WasmPath(script: string, wasmPath: string): string {
    const needle = 'self.location.hash.substr(1).split(",")';
    if (!script.includes(needle)) return script;

    const path = JSON.stringify(wasmPath);
    const replacement = `(self.location.hash.indexOf(${path})===-1?${path}:self.location.hash.substr(1)).split(",")`;
    return script.replace(needle, replacement);
}

/**
 * Runs before `stockfish-19.js` inside the engine worker.
 * The page sends either a compiled module or the wasm bytes over a message port.
 * Pthread workers are spawned from this same blob so they do not download sf-19.js again.
 */
export function stockfish19WorkerPreamble(wasmFileName: string): string {
    const fileName = JSON.stringify(wasmFileName);
    const portType = JSON.stringify(ENGINE_CACHE_PORT);

    return `(function(){
try {
if ((self.location.hash || '').indexOf(',worker') !== -1) return;
var OrigWorker = self.Worker;
self.Worker = function(url, opts) {
    var href = String(url);
    if (href.indexOf(',worker') !== -1) {
        var hashAt = href.indexOf('#');
        var hash = hashAt >= 0 ? href.slice(hashAt) : '';
        var base = String(self.location.href).split('#')[0];
        return new OrigWorker(base + hash, opts);
    }
    return new OrigWorker(url, opts);
};
var channel = new MessageChannel();
var payload = null;
var waiters = [];
channel.port1.onmessage = function(event) {
    payload = event.data || {};
    var pending = waiters;
    waiters = [];
    for (var i = 0; i < pending.length; i++) pending[i](payload);
};
function waitForPayload() {
    if (payload) return Promise.resolve(payload);
    return new Promise(function(resolve) {
        waiters.push(resolve);
        setTimeout(function() {
            if (!payload) resolve(null);
        }, 5000);
    });
}
var origFetch = self.fetch.bind(self);
var origInstantiateStreaming = WebAssembly.instantiateStreaming.bind(WebAssembly);
self.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(${fileName}) === -1) return origFetch(input, init);
    return waitForPayload().then(function(data) {
        if (!data) return origFetch(input, init);
        if (data.module) {
            self.__cachedWasmModule = data.module;
            return new Response(new Uint8Array(0), {
                status: 200,
                headers: { 'Content-Type': 'application/wasm' },
            });
        }
        if (data.bytes) {
            return WebAssembly.compile(data.bytes).then(function(wasmModule) {
                self.__cachedWasmModule = wasmModule;
                try {
                    channel.port1.postMessage({ module: wasmModule });
                } catch (err) {}
                return new Response(new Uint8Array(0), {
                    status: 200,
                    headers: { 'Content-Type': 'application/wasm' },
                });
            }).catch(function() {
                return origFetch(input, init);
            });
        }
        return origFetch(input, init);
    });
};
WebAssembly.instantiateStreaming = function(source, imports) {
    if (self.__cachedWasmModule) {
        var wasmModule = self.__cachedWasmModule;
        return WebAssembly.instantiate(wasmModule, imports).then(function(instance) {
            return { instance: instance, module: wasmModule };
        });
    }
    return origInstantiateStreaming(source, imports).then(function(result) {
        try {
            channel.port1.postMessage({ module: result.module });
        } catch (err) {}
        return result;
    });
};
self.postMessage({ type: ${portType}, port: channel.port2 }, [channel.port2]);
} catch (err) {}
})();
`;
}
