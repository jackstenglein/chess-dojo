import { logger } from '@/logging/logger';
import { EngineName } from './engine';
import { EngineWorker } from './EngineWorker';
import { objectStorage } from './objectStorage';
import makeModule from './sf171-79.js';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 17.1 NNUE (79 MB desktop version).
 */
export class Stockfish17 extends UciEngine {
    constructor() {
        if (!Stockfish17.isSupported()) {
            throw new Error('Stockfish 17 is not supported');
        }

        super(EngineName.Stockfish17);
    }

    public async init() {
        const worker: EngineWorker = await new Promise((resolve, reject) => {
            makeModule({
                wasmMemory: sharedWasmMemory(2560),
                onError: (msg: string) => reject(new Error(msg)),
            })
                .then(resolve)
                .catch(reject);
        });

        (await this.getModels(['nn-1c0000000000.nnue', 'nn-37f18f62d772.nnue'])).forEach(
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
                const store = await objectStorage<Uint8Array>({ store: 'nnue' }).catch(
                    () => undefined,
                );
                const storedBuffer = await store?.get(nnueFilename).catch(() => undefined);

                if (storedBuffer && storedBuffer.length > 128 * 1024) {
                    return storedBuffer;
                }

                const req = new XMLHttpRequest();
                req.open('get', `/static/engine/nnue/${nnueFilename}`, true);
                req.responseType = 'arraybuffer';
                req.onprogress = (e) => logger.debug?.(e);

                const nnueBuffer = await new Promise<Uint8Array>((resolve, reject) => {
                    req.onerror = () => reject(new Error(`NNUE download failed: ${req.status}`));
                    req.onload = () => {
                        if (req.status / 100 === 2)
                            resolve(new Uint8Array(req.response as Iterable<number>));
                        else reject(new Error(`NNUE download failed: ${req.status}`));
                    };
                    req.send();
                });
                store?.put(nnueFilename, nnueBuffer).catch(() => logger.warn?.('IDB store failed'));
                return nnueBuffer;
            }),
        );
    }
}

export const sharedWasmMemory = (lo: number, hi = 32767): WebAssembly.Memory => {
    let shrink = 4; // 32767 -> 24576 -> 16384 -> 12288 -> 8192 -> 6144 -> etc

    while (true) {
        try {
            return new WebAssembly.Memory({ shared: true, initial: lo, maximum: hi });
        } catch (e) {
            if (hi <= lo || !(e instanceof RangeError)) throw e;
            hi = Math.max(lo, Math.ceil(hi - hi / shrink));
            shrink = shrink === 4 ? 3 : 4;
        }
    }
};
