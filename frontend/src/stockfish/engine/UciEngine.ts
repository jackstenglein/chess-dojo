import { logger } from '@/logging/logger';
import {
    EngineWorker,
    UciEngine as StockfishTsUciEngine,
    StockfishWasmEngine,
} from '@jalpp/stockfishts';

/**
 * Dojo-specific adapter around the stockfishts UciEngine.
 *
 * The UCI protocol handling, option management, search mutexes and result
 * parsing all live in @jalpp/stockfishts. This class only keeps the behavior
 * that is specific to the Dojo:
 *   - worker messages and errors are sent to the Dojo logger
 *   - engine strength is never limited (stockfishts enables UCI_LimitStrength by default)
 */
export abstract class UciEngine extends StockfishTsUciEngine {
    /**
     * Gets an EngineWorker from the given stockfish.js path, logging worker
     * messages and errors through the Dojo logger.
     * @param path The stockfish.js path to create an EngineWorker from.
     * @returns An EngineWorker using the given stockfish.js path.
     */
    public static workerFromPath(path: string): EngineWorker {
        const engineWorker = StockfishTsUciEngine.workerFromPath(path);
        engineWorker.listen = (data) => logger.debug?.(data);
        engineWorker.onError = (err) => logger.error?.(err);
        return engineWorker;
    }

    /**
     * @returns True if the current runtime supports WebAssembly.
     */
    public static isSupported(): boolean {
        return StockfishWasmEngine.isSupported();
    }

    /**
     * Initializes the engine. This must be called before evaluating any positions.
     */
    public async init(): Promise<void> {
        await super.init();
        if (this.worker) {
            // Analysis should always run at full strength.
            await this.sendCommands(
                ['setoption name UCI_LimitStrength value false', 'isready'],
                'readyok',
            );
        }
    }
}
