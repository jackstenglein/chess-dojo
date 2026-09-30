import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 19 NNUE (desktop version).
 */
export class Stockfish19 extends UciEngine {
    constructor() {
        if (!Stockfish19.isSupported()) {
            throw new Error('Stockfish 19 is not supported');
        }

        const enginePath = '/static/engine/stockfish-19.js#/static/engine/stockfish-19.wasm';
        const worker = UciEngine.workerFromPath(enginePath);

        super(EngineName.Stockfish19, worker);
    }

    public async init() {
        await super.init();
        await this.sendCommands(['position startpos', 'go depth 1'], 'bestmove');
    }
}
