/* eslint-disable no-console */
import { EngineName, EnginePathRecord, EngineWasmPathRecord } from './engine';
import { debug, isMultiThreadSupported, isWasmSupported } from './helper';
import { UciEngineFactory } from './UciEngineFactory';

export async function createStockfishEngine(
    stockfishVersion: EngineName,
): Promise<UciEngineFactory> {
    console.log(`[Stockfish] Creating engine for version: ${stockfishVersion}`);

    if (!isStockfishSupported()) {
        const error = `${stockfishVersion} is not supported`;
        console.error(`[Stockfish] ${error}`);
        throw new Error(error);
    }

    const lite: boolean = stockfishVersion === EngineName.Stockfish16 || stockfishVersion == EngineName.Stockfish17;
    console.log(`[Stockfish] Lite mode: ${lite}`);

    const multiThreadIsSupported = isMultiThreadSupported();
    console.log(`[Stockfish] Multi-thread supported: ${multiThreadIsSupported}`);

    if (!multiThreadIsSupported) {
        debug('Single thread mode');
    }

    const stockfishPath = EnginePathRecord[stockfishVersion];
    const wasmPath = EngineWasmPathRecord[stockfishVersion];
    console.log(`[Stockfish] Base path: ${stockfishPath}`);

    let enginePath;

    if (stockfishVersion === EngineName.Stockfish11) {
        enginePath = stockfishPath;
    } else {
        enginePath = `${stockfishPath}${
            lite ? '-lite' : ''
        }${multiThreadIsSupported ? '' : '-single'}.js#${wasmPath}`;
    }

    console.log(`[Stockfish] Resolved engine path: ${enginePath}`);

    return UciEngineFactory.create(stockfishVersion, enginePath);
}

export function isStockfishSupported(): boolean {
    return isWasmSupported();
}
