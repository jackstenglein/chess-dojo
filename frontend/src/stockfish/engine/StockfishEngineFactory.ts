import { EngineName, EnginePathRecord } from './engine';
import { debug, isMultiThreadSupported, isWasmSupported } from './helper';
import { UciEngineFactory } from './UciEngineFactory';

export async function createStockfishEngine(
    stockfishVersion: EngineName,
): Promise<UciEngineFactory> {
    if (!isStockfishSupported()) {
        throw new Error(`${stockfishVersion} is not supported`);
    }

    const lite: boolean = stockfishVersion === EngineName.Stockfish16;

    const multiThreadIsSupported = isMultiThreadSupported();

    if (!multiThreadIsSupported) {
        debug('Single thread mode');
    }

    const stockfishPath = EnginePathRecord[stockfishVersion];

    let enginePath;

    if (stockfishVersion === EngineName.Stockfish11) {
        enginePath = stockfishPath;
    } else {
        enginePath = `${stockfishPath}${
            lite ? '-lite' : ''
        }${multiThreadIsSupported ? '' : '-single'}.js`;
    }

    return UciEngineFactory.create(stockfishVersion, enginePath);
}

export function isStockfishSupported(): boolean {
    return isWasmSupported();
}
