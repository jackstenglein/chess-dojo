import { logger } from '@/logging/logger';
import { EngineName } from './engine';
import { loadCachedScript, loadCachedWasmModule, SF18_JS, SF18_WASM } from './engineAssetCache';
import { EngineWorker } from './EngineWorker';
import { objectStorage } from './objectStorage';
import makeModule from './sf18.js';
import { sharedWasmMemory } from './Stockfish17';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 18 NNUE (desktop version).
 */
export class Stockfish18 extends UciEngine {
    private workerScriptUrl?: string;

    constructor() {
        if (!Stockfish18.isSupported()) {
            throw new Error('Stockfish 18 is not supported');
        }

        super(EngineName.Stockfish18);
    }

    public async init() {
        const cached = await this.prepareCache();
        let worker: EngineWorker;
        try {
            worker = await this.createWorker(cached);
        } catch (err) {
            this.revokeWorkerScript();
            if (!cached) throw err;
            logger.warn('Cached Stockfish 18 failed; loading it directly', err);
            worker = await this.createWorker();
        }

        (await this.getModels(['nn-c288c895ea92.nnue.gz', 'nn-37f18f62d772.nnue'])).forEach(
            (nnueBuffer, i) => worker.setNnueBuffer?.(nnueBuffer, i),
        );

        this.worker = worker;
        await super.init();
    }

    public shutdown(): void {
        super.shutdown();
        this.revokeWorkerScript();
    }

    public static isSupported() {
        return (
            typeof WebAssembly === 'object' &&
            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        );
    }

    private async prepareCache(): Promise<
        { wasmModule: WebAssembly.Module; workerScriptUrl: string } | undefined
    > {
        try {
            const [wasmModule, script] = await Promise.all([
                loadCachedWasmModule(SF18_WASM),
                loadCachedScript(SF18_JS),
            ]);
            const workerScriptUrl = URL.createObjectURL(
                new Blob([script], { type: 'text/javascript' }),
            );
            this.workerScriptUrl = workerScriptUrl;
            return { wasmModule, workerScriptUrl };
        } catch (err) {
            logger.warn('Unable to cache Stockfish 18; loading it directly', err);
            return undefined;
        }
    }

    private createWorker(cached?: {
        wasmModule: WebAssembly.Module;
        workerScriptUrl: string;
    }): Promise<EngineWorker> {
        return new Promise((resolve, reject) => {
            makeModule({
                wasmMemory: sharedWasmMemory(2560),
                onError: (msg: string) => reject(new Error(msg)),
                ...(cached
                    ? {
                          mainScriptUrlOrBlob: cached.workerScriptUrl,
                          instantiateWasm: (
                              imports: WebAssembly.Imports,
                              receiveInstance: (
                                  instance: WebAssembly.Instance,
                                  wasmModule: WebAssembly.Module,
                              ) => void,
                          ) => {
                              WebAssembly.instantiate(cached.wasmModule, imports)
                                  .then((instance) => receiveInstance(instance, cached.wasmModule))
                                  .catch(reject);
                          },
                      }
                    : {}),
            })
                .then((m: unknown) => resolve(m as EngineWorker))
                .catch(reject);
        });
    }

    private revokeWorkerScript() {
        if (!this.workerScriptUrl) return;
        URL.revokeObjectURL(this.workerScriptUrl);
        this.workerScriptUrl = undefined;
    }

    private getModels(nnueFilenames: string[]): Promise<Uint8Array[]> {
        return Promise.all(
            nnueFilenames.map(async (nnueFilename) => {
                const cacheKey = nnueFilename.replace(/\.gz$/, '');

                const store = await objectStorage<Uint8Array>({ store: 'nnue' }).catch(
                    () => undefined,
                );
                const storedBuffer = await store?.get(cacheKey).catch(() => undefined);

                if (storedBuffer && storedBuffer.length > 128 * 1024) {
                    return storedBuffer;
                }

                const req = new XMLHttpRequest();
                req.open('get', `/static/engine/nnue/${nnueFilename}`, true);
                req.responseType = 'arraybuffer';
                req.onprogress = (e) => logger.debug(e);

                let nnueBuffer = await new Promise<Uint8Array>((resolve, reject) => {
                    req.onerror = () => reject(new Error(`NNUE download failed: ${req.status}`));
                    req.onload = () => {
                        if (req.status / 100 === 2)
                            resolve(new Uint8Array(req.response as Iterable<number>));
                        else reject(new Error(`NNUE download failed: ${req.status}`));
                    };
                    req.send();
                });

                if (nnueFilename.endsWith('.gz')) {
                    if (typeof DecompressionStream === 'undefined') {
                        throw new Error(
                            'Browser does not support DecompressionStream. ' +
                                'Please update your browser or try Stockfish 18 Lite.',
                        );
                    }

                    try {
                        const ds = new DecompressionStream('gzip');
                        const decompressed = new Response(
                            new Blob([nnueBuffer.buffer as ArrayBuffer]).stream().pipeThrough(ds),
                        );
                        nnueBuffer = new Uint8Array(await decompressed.arrayBuffer());
                    } catch (err) {
                        throw new Error(
                            `Failed to decompress NNUE file ${nnueFilename}: ${err instanceof Error ? err.message : String(err)}`,
                        );
                    }
                }

                store?.put(cacheKey, nnueBuffer).catch(() => logger.warn('IDB store failed'));
                return nnueBuffer;
            }),
        );
    }
}
