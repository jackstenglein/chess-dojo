import { getConfig } from '@/config';
import { EngineWorker, WorkerJob, getEngineWorker, sendCommandsToWorker } from './EngineWorker';
import {
    ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_THREADS,
    EngineName,
    EvaluatePositionWithUpdateParams,
    PositionEval,
} from './engine';
import { debug } from './helper';
import { parseEvaluationResults } from './parseResults';


const config = getConfig();

/**
 * Factory class for managing UCI (Universal Chess Interface) chess engine instances.
 *
 * Handles engine lifecycle including worker pool management, job queuing,
 * and configuration of engine options such as MultiPV, Threads, and Hash size.
 *
 * @example
 * ```ts
 * const engine = await UciEngineFactory.create(EngineName.Stockfish, '/path/to/stockfish');
 * const eval = await engine.evaluatePositionWithUpdate({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
 * engine.shutdown();
 * ```
 */
export class UciEngineFactory {
    /** The name identifier of the chess engine. */
    public readonly name: EngineName;

    /** Pool of engine workers available for processing jobs. */
    private workers: EngineWorker[] = [];

    /** Queue of pending jobs waiting for an available worker. */
    private workerQueue: WorkerJob[] = [];

    /** Whether the engine has been initialized and is ready to accept jobs. */
    private isReady = false;

    /** File path to the engine binary or WASM module. */
    private enginePath: string;

    /** Optional custom initialization function called on each new worker. */
    private customEngineInit?: ((worker: EngineWorker) => Promise<void>) | undefined = undefined;

    /** Number of lines (principal variations) the engine should analyze simultaneously. */
    private multiPv: number = ENGINE_LINE_COUNT.Default;

    /** Number of CPU threads the engine should use. */
    private threads: number = ENGINE_THREADS.Default;

    /** Hash table size in MB allocated for the engine's transposition table. */
    private hash: number = Math.pow(2, ENGINE_HASH.Default);

    /** Whether debug logging is enabled. */
    private _debug: boolean;

    /**
     * Private constructor — use {@link UciEngineFactory.create} to instantiate.
     *
     * @param engineName - The name identifier for this engine.
     * @param enginePath - File path to the engine binary or WASM module.
     * @param customEngineInit - Optional async function for custom worker initialization.
     * @param debug - Whether to enable debug logging.
     */
    private constructor(
        engineName: EngineName,
        enginePath: string,
        customEngineInit: UciEngineFactory['customEngineInit'],
        debug: boolean,
    ) {
        this.name = engineName;
        this.enginePath = enginePath;
        this.customEngineInit = customEngineInit;
        this._debug = debug;
    }

    /**
     * Creates and fully initializes a new `UciEngineFactory` instance.
     *
     * Spawns an initial worker, sends the `uci` handshake, enables WDL output,
     * and applies default MultiPV, Threads, and Hash settings.
     *
     * @param engineName - The name identifier for this engine.
     * @param enginePath - File path to the engine binary or WASM module.
     * @param customEngineInit - Optional async function run on each new worker after creation.
     * @param debug - Whether to enable debug logging. Defaults to `config.isBeta`.
     * @returns A fully initialized `UciEngineFactory` ready to evaluate positions.
     *
     * @example
     * ```ts
     * const engine = await UciEngineFactory.create(EngineName.Stockfish, '/stockfish.wasm');
     * ```
     */
    public static async create(
        engineName: EngineName,
        enginePath: string,
        customEngineInit?: UciEngineFactory['customEngineInit'],
        debug = config.isBeta,
    ): Promise<UciEngineFactory> {
        const engine = new UciEngineFactory(engineName, enginePath, customEngineInit, debug);
        engine.engineDebug(`Creating engine: ${engineName} from path: ${enginePath}`);

        await engine.addNewWorker();
        engine.isReady = true;
        engine.engineDebug(`Engine ${engineName} is ready`);
        await engine.sendCommandsToEachWorker(['uci'], 'uciok');
        await engine.sendCommands(
            ['setoption name UCI_ShowWDL value true', 'isready'],
            'readyok',
        );
        await engine.setMultiPv(engine.getMultiPv, true);
        await engine.setThreads(engine.getThreads, true);
        await engine.setHash(engine.getHash, true);
        return engine;
    }

    /**
     * Acquires a free worker from the pool, marking it as busy.
     *
     * @returns The first available `EngineWorker`, or `undefined` if all workers are busy.
     */
    private acquireWorker(): EngineWorker | undefined {
        for (const worker of this.workers) {
            if (!worker.isReady) continue;

            worker.isReady = false;
            this.engineDebug(`Worker acquired, pool size: ${this.workers.length - 1} available`);
            return worker;
        }

        this.engineDebug('No available workers, queuing job');
        return undefined;
    }

    /**
     * Releases a worker back to the pool, or immediately assigns it to the next queued job.
     *
     * @param worker - The worker to release.
     */
    private async releaseWorker(worker: EngineWorker) {
        const nextJob = this.workerQueue.shift();
        if (!nextJob) {
            worker.isReady = true;
            this.engineDebug(
                `Worker released, available workers: ${this.workers.filter((w) => w.isReady).length}`,
            );
            return;
        }

        this.engineDebug(`Processing queued job, remaining queue size: ${this.workerQueue.length}`);
        const res = await sendCommandsToWorker(
            worker,
            nextJob.commands,
            nextJob.finalMessage,
            nextJob.onNewMessage,
        );

        await this.releaseWorker(worker);
        nextJob.resolve(res);
    }

    /**
     * The current MultiPV (number of principal variations) setting.
     *
     * @returns The number of lines the engine is configured to analyze simultaneously.
     */
    public get getMultiPv() {
        return this.multiPv;
    }

    /**
     * The current hash table size in MB.
     *
     * @returns The hash size as a power of 2 (e.g., 128, 256).
     */
    public get getHash() {
        return this.hash;
    }

    /**
     * The current thread count used by the engine.
     *
     * @returns The number of CPU threads configured for the engine.
     */
    public get getThreads() {
        return this.threads;
    }

    /**
     * Sets the MultiPV option on all workers.
     *
     * @param multiPv - The number of principal variations to analyze (minimum 1, maximum `ENGINE_LINE_COUNT.Max`).
     * @param forceInit - If `true`, skips the equality check and always sends the command. Used during initialization.
     * @throws {Error} If `multiPv` exceeds `ENGINE_LINE_COUNT.Max`.
     */
    private async setMultiPv(multiPv: number, forceInit = false) {
        if (!forceInit) {
            if (multiPv === this.multiPv) {
                this.engineDebug(`MultiPV already set to ${multiPv}, skipping`);
                return;
            }

            this.throwErrorIfNotReady();
        }

        if (multiPv > ENGINE_LINE_COUNT.Max) {
            throw new Error(`Invalid MultiPV value : ${multiPv}`);
        }
        if (multiPv < 1) {
            multiPv = 1;
        }

        this.engineDebug(`Setting MultiPV to ${multiPv}`);
        await this.sendCommandsToEachWorker(
            [`setoption name MultiPV value ${multiPv}`, 'isready'],
            'readyok',
        );

        this.multiPv = multiPv;
    }

    /**
     * Sets the Threads option on all workers.
     *
     * @param threads - The number of CPU threads for the engine to use.
     * @param forceInit - If `true`, skips the equality check and always sends the command. Used during initialization.
     * @throws {Error} If `threads` is outside the range `[ENGINE_THREADS.Min, ENGINE_THREADS.Max]`.
     */
    private async setThreads(threads: number, forceInit = false) {
        if (!forceInit) {
            if (threads === this.threads) {
                this.engineDebug(`Threads already set to ${threads}, skipping`);
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (threads < ENGINE_THREADS.Min || threads > ENGINE_THREADS.Max) {
            throw new Error(
                `Invalid threads value (${threads}) is not in range [${ENGINE_THREADS.Min}, ${ENGINE_THREADS.Max}]`,
            );
        }
        this.engineDebug(`Setting threads to ${threads}`);
        await this.sendCommandsToEachWorker(
            [`setoption name Threads value ${threads}`, 'isready'],
            'readyok',
        );
        this.threads = threads;
    }

    /**
     * Sets the Hash table size option on all workers.
     *
     * @param hash - The hash size in MB. Must be a power of 2 within `[2^ENGINE_HASH.Min, 2^ENGINE_HASH.Max]`.
     * @param forceInit - If `true`, skips the equality check and always sends the command. Used during initialization.
     * @throws {Error} If `hash` is outside the valid power-of-2 range.
     */
    private async setHash(hash: number, forceInit = false) {
        if (!forceInit) {
            if (hash === this.hash) {
                this.engineDebug(`Hash already set to ${hash}, skipping`);
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (hash < Math.pow(2, ENGINE_HASH.Min) || hash > Math.pow(2, ENGINE_HASH.Max)) {
            throw new Error(
                `Invalid threads value (${hash}) is not in range [${Math.pow(2, ENGINE_HASH.Min)}, ${Math.pow(2, ENGINE_HASH.Max)}]`,
            );
        }
        this.engineDebug(`Setting hash to ${hash} MB`);
        await this.sendCommandsToEachWorker(
            [`setoption name Hash value ${hash}`, 'isready'],
            'readyok',
        );
        this.hash = hash;
    }

    /**
     * Returns whether the engine is initialized and ready to accept evaluation requests.
     *
     * @returns `true` if the engine is ready, `false` otherwise.
     */
    public getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * Throws an error if the engine has not been initialized yet.
     *
     * @throws {Error} If `isReady` is `false`.
     */
    private throwErrorIfNotReady() {
        if (!this.isReady) {
            throw new Error(`${this.name} is not ready`);
        }
    }

    /**
     * Shuts down the engine by terminating all workers and clearing the job queue.
     *
     * After calling this method, the engine can no longer be used.
     */
    public shutdown(): void {
        this.engineDebug(`Shutting down engine, terminating ${this.workers.length} workers`);
        this.isReady = false;
        this.workerQueue = [];

        for (const worker of this.workers) {
            this.terminateWorker(worker);
        }
        this.workers = [];
        this.engineDebug('Engine shutdown complete');
    }

    /**
     * Sends the `quit` command to a worker and terminates its underlying process.
     *
     * @param worker - The worker to terminate.
     */
    private terminateWorker(worker: EngineWorker) {
        this.engineDebug(`Terminating worker from ${this.enginePath}`);
        worker.isReady = false;
        worker.uci('quit');
        worker.terminate();
    }

    /**
     * Stops all currently running and queued engine jobs.
     *
     * Clears the job queue and sends a `stop` command to each worker,
     * then releases all workers back to the pool.
     */
    public async stopAllCurrentJobs(): Promise<void> {
        this.engineDebug(`Stopping all jobs, queue size: ${this.workerQueue.length}`);
        this.workerQueue = [];
        await this.sendCommandsToEachWorker(['stop', 'isready'], 'readyok');

        for (const worker of this.workers) {
            await this.releaseWorker(worker);
        }
        this.engineDebug('All jobs stopped');
    }

    /**
     * Sends a sequence of UCI commands to an available worker.
     *
     * If no worker is free, the job is added to the queue and will be resolved
     * once a worker becomes available.
     *
     * @param commands - Ordered list of UCI commands to send.
     * @param finalMessage - The engine output string that signals completion (e.g., `'bestmove'`, `'readyok'`).
     * @param onNewMessage - Optional callback invoked with accumulated output whenever new messages arrive.
     * @returns A promise resolving to the full list of engine output lines received.
     */
    private async sendCommands(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<string[]> {
        const worker = this.acquireWorker();

        if (!worker) {
            this.engineDebug(`Queueing commands: ${commands.join(', ')}`);
            return new Promise((resolve) => {
                this.workerQueue.push({
                    commands,
                    finalMessage,
                    onNewMessage,
                    resolve,
                });
            });
        }

        this.engineDebug(`Sending commands: ${commands.join(', ')}`);
        const res = await sendCommandsToWorker(worker, commands, finalMessage, onNewMessage);

        await this.releaseWorker(worker);
        return res;
    }

    /**
     * Broadcasts a sequence of UCI commands to every worker in the pool simultaneously.
     *
     * @param commands - Ordered list of UCI commands to send to each worker.
     * @param finalMessage - The engine output string that signals completion for each worker.
     * @param onNewMessage - Optional callback invoked with accumulated output on each message.
     */
    private async sendCommandsToEachWorker(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<void> {
        this.engineDebug(
            `Broadcasting commands to ${this.workers.length} workers: ${commands.join(', ')}`,
        );
        await Promise.all(
            this.workers.map(async (worker) => {
                await sendCommandsToWorker(worker, commands, finalMessage, onNewMessage);
                await this.releaseWorker(worker);
            }),
        );
    }

    /**
     * Spawns a new engine worker, runs custom initialization if provided,
     * and adds it to the worker pool.
     */
    private async addNewWorker() {
        this.engineDebug(`Adding new worker for engine at ${this.enginePath}`);
        const worker = getEngineWorker(this.enginePath);
        await this.customEngineInit?.(worker);

        this.workers.push(worker);
        this.engineDebug(`Worker added, total workers: ${this.workers.length}`);
        await this.releaseWorker(worker);
    }

    /**
     * Evaluates a chess position and streams partial results as the engine searches deeper.
     *
     * Stops any currently running jobs, applies the provided engine settings,
     * then runs a depth-limited search on the given FEN position. The `setPartialEval`
     * callback is invoked incrementally as new `info` lines are received.
     *
     * @param params - Evaluation parameters.
     * @param params.fen - The position to evaluate in FEN notation.
     * @param params.depth - Search depth in plies. Defaults to `ENGINE_DEPTH.Default`.
     * @param params.multiPv - Number of principal variations to return. Defaults to the current MultiPV setting.
     * @param params.threads - Number of CPU threads to use. Defaults to `ENGINE_THREADS.Default`.
     * @param params.hash - Hash table size in MB. Defaults to `2^ENGINE_HASH.Default`.
     * @param params.setPartialEval - Optional callback invoked with partial evaluation results during the search.
     * @returns A promise resolving to the final {@link PositionEval} once the search is complete.
     * @throws {Error} If the engine is not ready.
     *
     * @example
     * ```ts
     * const result = await engine.evaluatePositionWithUpdate({
     *   fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
     *   depth: 20,
     *   setPartialEval: (partial) => console.log(partial),
     * });
     * ```
     */
    public async evaluatePositionWithUpdate({
        fen,
        depth = ENGINE_DEPTH.Default,
        multiPv = this.multiPv,
        threads = ENGINE_THREADS.Default,
        hash = Math.pow(2, ENGINE_HASH.Default),
        setPartialEval,
    }: EvaluatePositionWithUpdateParams): Promise<PositionEval> {
        this.throwErrorIfNotReady();

        this.engineDebug(
            `Starting evaluation: depth=${depth}, multiPv=${multiPv}, threads=${threads}, hash=${hash}`,
        );
        await this.stopAllCurrentJobs();
        await this.setMultiPv(multiPv);
        await this.setHash(hash);
        await this.setThreads(threads);

        const whiteToPlay = fen.split(' ')[1] === 'w';

        const onNewMessage = (messages: string[]) => {
            if (!setPartialEval) return;
            const parsedResults = parseEvaluationResults(fen, messages, whiteToPlay);
            setPartialEval(parsedResults);
        };

        this.engineDebug(`Evaluating position: ${fen}`);

        const results = await this.sendCommands(
            [`position fen ${fen}`, `go depth ${depth}`],
            'bestmove',
            onNewMessage,
        );

        this.engineDebug('Evaluation complete');
        return parseEvaluationResults(fen, results, whiteToPlay);
    }

    /**
     * Logs a debug message if debug mode is enabled.
     *
     * @param message - The primary message or value to log.
     * @param optionalParams - Additional values to include in the log output.
     */
    private engineDebug(message?: unknown, ...optionalParams: unknown[]) {
        if (this._debug) {
            debug(message, optionalParams);
        }
    }
}