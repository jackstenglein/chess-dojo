import { EngineName, EnginePathRecord } from './engine';
import { debug, isMultiThreadSupported, isWasmSupported } from './helper';
import { UciEngineFactory } from './UciEngineFactory';

/**
 * creates a stockfish UCI engine based on stockfish engine version name
 * @param stockfishVersion Stockfish name
 * @returns UCIEngineFactory
 */
export async function createStockfishEngine(
    stockfishVersion: EngineName,
): Promise<UciEngineFactory> {
    debug(`[Stockfish] Creating engine for version: ${stockfishVersion}`);

    if (!isStockfishSupported()) {
        const error = `${stockfishVersion} is not supported`;
        console.error(`[Stockfish] ${error}`);
        throw new Error(error);
    }

    const multiThreadIsSupported = isMultiThreadSupported();
    debug(`[Stockfish] Multi-thread supported: ${multiThreadIsSupported}`);

    const stockfishPath = EnginePathRecord[stockfishVersion];
    debug(`[Stockfish] Base path: ${stockfishPath}`);

    return UciEngineFactory.create(stockfishVersion, stockfishPath);
}

export function isStockfishSupported(): boolean {
    return isWasmSupported();
}
