import { EngineName } from './engine';
import { UciEngine } from './UciEngine';

/**
 * Runs Stockfish 18 NNUE Multi threaded (100 MB mobile version).
 */
export class Stockfish18 extends UciEngine {
    constructor() {
        if (!Stockfish18.isSupported()) {
            throw new Error('Stockfish 18 is not supported');
        }

        const enginePath = '/static/engine/stockfish-18.js#/static/engine/stockfish-18.wasm';
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

    public static isSupported() {
        return (
            typeof WebAssembly === 'object' &&
            WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        );
    }
}
