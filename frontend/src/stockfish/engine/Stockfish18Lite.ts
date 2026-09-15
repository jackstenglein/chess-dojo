import { logger } from '@/logging/logger';
import { EngineName } from './engine';
import { EngineWorker } from './EngineWorker';
import { objectStorage } from './objectStorage';
import makeModule from './sf18-smallnet.js';
import { sharedWasmMemory } from './Stockfish17';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 18 NNUE smallnet (mobile/lighter version).
 */
export class Stockfish18Lite extends UciEngine {
    constructor() {
        if (!Stockfish18Lite.isSupported()) {
            throw new Error('Stockfish 18 Lite is not supported');
        }

        super(EngineName.Stockfish18Lite);
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

        (await this.getModels(['nn-4ca89e4b3abf.nnue'])).forEach((nnueBuffer, i) =>
            worker.setNnueBuffer?.(nnueBuffer, i),
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
