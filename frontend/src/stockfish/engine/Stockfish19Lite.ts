import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 19 NNUE lite (mobile/lighter version).
 */
export class Stockfish19Lite extends UciEngine {
    constructor() {
        if (!Stockfish19Lite.isSupported()) {
            throw new Error('Stockfish 19 Lite is not supported');
        }

        const enginePath =
            '/static/engine/stockfish-19-lite.js#/static/engine/stockfish-19-lite.wasm';
        const worker = UciEngine.workerFromPath(enginePath);

        super(EngineName.Stockfish19Lite, worker);
    }

    public async init() {
        await super.init();
        await this.sendCommands(['position startpos', 'go depth 1'], 'bestmove');
    }
}
