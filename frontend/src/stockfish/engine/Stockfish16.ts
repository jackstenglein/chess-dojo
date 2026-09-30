import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 16.1 NNUE (6 MB mobile version).
 */
export class Stockfish16 extends UciEngine {
    constructor() {
        if (!Stockfish16.isSupported()) {
            throw new Error('Stockfish 16 is not supported');
        }

        const enginePath =
            '/static/engine/stockfish-16.1-lite.js#/static/engine/stockfish-16.1-lite.wasm';
        const worker = UciEngine.workerFromPath(enginePath);
        super(EngineName.Stockfish16, worker);
    }

    /**
     * Initialized the Stockfish 16.1 lite engine. For some reason, this engine hangs
     * if it sends multiple setoption commands for the same option without running a go
     * command in between. For that reason, we run `go depth 1` on the starting command
     * in order to allow setting the options when the user first runs the engine on a
     * real position.
     */
    public async init() {
        await super.init();
        await this.sendCommands(['position startpos', 'go depth 1'], 'bestmove');
    }
}
