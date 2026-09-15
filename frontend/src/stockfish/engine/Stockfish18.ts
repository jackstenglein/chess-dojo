import { logger } from '@/logging/logger';
import { EngineName } from './engine';
import { EngineWorker } from './EngineWorker';
import { objectStorage } from './objectStorage';
import makeModule from './sf18.js';
import { sharedWasmMemory } from './Stockfish17';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 18 NNUE (desktop version).
 */
export class Stockfish18 extends UciEngine {
    constructor() {
        if (!Stockfish18.isSupported()) {
            throw new Error('Stockfish 18 is not supported');
        }

        super(EngineName.Stockfish18);
    }

    public async init() {
        const worker: EngineWorker = await new Promise((resolve, reject) => {
            makeModule({
                wasmMemory: sharedWasmMemory(2560),
                onError: (msg: string) => reject(new Error(msg)),
            })
                .then((m: unknown) => resolve(m as EngineWorker))
                .catch(reject);
        });

        (await this.getModels(['nn-c288c895ea92.nnue.gz', 'nn-37f18f62d772.nnue'])).forEach(
            (nnueBuffer, i) => worker.setNnueBuffer?.(nnueBuffer, i),
        );

        this.worker = worker;
        await super.init();
    }

    public static isSupported() {
        return (
            typeof WebAssembly === 'object' &&
            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        );
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
                req.onprogress = (e) => logger.debug?.(e);

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

                store?.put(cacheKey, nnueBuffer).catch(() => logger.warn?.('IDB store failed'));
                return nnueBuffer;
            }),
        );
    }
}
