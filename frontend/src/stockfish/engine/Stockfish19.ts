import { logger } from '@/logging/logger';
import { EngineName } from './engine';
import {
    getRememberedWasmModule,
    loadCachedBytes,
    loadCachedScript,
    rememberWasmModule,
    SF19_JS,
    SF19_WASM,
} from './engineAssetCache';
import {
    bindStockfish19WasmPath,
    ENGINE_CACHE_PORT,
    stockfish19WorkerPreamble,
} from './stockfish19WorkerShim';
import { UciEngine } from './UciEngine';

const WASM_FILE_NAME = 'stockfish-19.wasm';

interface EngineCachePortMessage {
    type: typeof ENGINE_CACHE_PORT;
    port: MessagePort;
}

/**
 * Runs Stockfish 19 NNUE (desktop version).
 */
export class Stockfish19 extends UciEngine {
    private workerUrl?: string;

    constructor() {
        if (!Stockfish19.isSupported()) {
            throw new Error('Stockfish 19 is not supported');
        }

        super(EngineName.Stockfish19);
    }

    public async init() {
        try {
            await this.attachCachedWorker();
        } catch (err) {
            logger.warn('Stockfish 19 cache unavailable; loading engine directly', err);
            this.worker?.terminate?.();
            this.revokeWorkerUrl();
            this.worker = UciEngine.workerFromPath(`${SF19_JS}#${SF19_WASM}`);
        }

        await super.init();
        await this.sendCommands(['position startpos', 'go depth 1'], 'bestmove');
    }

    public shutdown(): void {
        super.shutdown();
        this.revokeWorkerUrl();
    }

    public static isSupported() {
        const isSupported =
            typeof WebAssembly === 'object' &&
            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
        return isSupported;
    }

    /**
     * Loads stockfish-19.js and its wasm through the Cache API. The compiled module is
     * kept in memory, so the next time the engine is turned on it skips both steps.
     * Pthread workers are created from the same cached script blob.
     */
    private async attachCachedWorker(): Promise<void> {
        const remembered = getRememberedWasmModule(SF19_WASM);
        const [script, wasmModule] = await Promise.all([
            loadCachedScript(SF19_JS),
            remembered ?? Promise.resolve(undefined),
        ]);
        const wasmBytes = wasmModule ? undefined : await loadCachedBytes(SF19_WASM);
        const source =
            stockfish19WorkerPreamble(WASM_FILE_NAME) + bindStockfish19WasmPath(script, SF19_WASM);
        const workerUrl = URL.createObjectURL(
            new Blob([source], { type: 'application/javascript' }),
        );
        this.workerUrl = workerUrl;

        let worker: Worker;
        try {
            worker = new Worker(`${workerUrl}#${SF19_WASM}`);
        } catch (err) {
            this.revokeWorkerUrl();
            throw err;
        }

        let delivered = false;
        this.worker = UciEngine.workerFromWorker(worker, (data) => {
            if (!isEngineCachePortMessage(data)) return false;
            if (delivered) return true;
            delivered = true;
            this.deliverWasm(data.port, wasmModule, wasmBytes);
            return true;
        });
    }

    private deliverWasm(
        port: MessagePort,
        wasmModule: WebAssembly.Module | undefined,
        wasmBytes: ArrayBuffer | undefined,
    ) {
        if (wasmModule) {
            port.postMessage({ module: wasmModule });
            logger.debug('Starting Stockfish 19 from the cached wasm module');
        } else if (wasmBytes) {
            port.postMessage({ bytes: wasmBytes }, [wasmBytes]);
        }

        port.onmessage = (event: MessageEvent<{ module?: WebAssembly.Module }>) => {
            const compiled = event.data?.module;
            if (!(compiled instanceof WebAssembly.Module)) return;
            rememberWasmModule(SF19_WASM, compiled);
            logger.debug('Cached compiled Stockfish 19 module');
        };
    }

    private revokeWorkerUrl() {
        if (!this.workerUrl) return;
        URL.revokeObjectURL(this.workerUrl);
        this.workerUrl = undefined;
    }
}

function isEngineCachePortMessage(data: unknown): data is EngineCachePortMessage {
    if (!data || typeof data !== 'object') return false;
    const message = data as { type?: unknown; port?: unknown };
    return message.type === ENGINE_CACHE_PORT && message.port instanceof MessagePort;
}
