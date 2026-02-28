import { getConfig } from '@/config';
import { EngineWorker, WorkerJob, getEngineWorker, sendCommandsToWorker } from './EngineWorker';
import { ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_THREADS, EngineName, EvaluatePositionWithUpdateParams, PositionEval } from './engine';
import { parseEvaluationResults } from './parseResults';
import { debug } from './helper';

const config = getConfig();

export class UciEngineFactory {
    public readonly name: EngineName;
    private workers: EngineWorker[] = [];
    private workerQueue: WorkerJob[] = [];
    private isReady = false;
    private enginePath: string;
    private customEngineInit?: ((worker: EngineWorker) => Promise<void>) | undefined = undefined;
    private multiPv: number = ENGINE_LINE_COUNT.Default;
    private threads: number = ENGINE_THREADS.Default;
    private hash: number = Math.pow(2, ENGINE_HASH.Default);
    private _debug: boolean;

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

    public static async create(
        engineName: EngineName,
        enginePath: string,
        customEngineInit?: UciEngineFactory['customEngineInit'],
        debug = config.isBeta,
    ): Promise<UciEngineFactory> {
        const engine = new UciEngineFactory(engineName, enginePath, customEngineInit, debug);

        await engine.addNewWorker();
        engine.isReady = true;

        return engine;
    }

    private acquireWorker(): EngineWorker | undefined {
        for (const worker of this.workers) {
            if (!worker.isReady) continue;

            worker.isReady = false;
            return worker;
        }

        return undefined;
    }

    private async releaseWorker(worker: EngineWorker) {
        const nextJob = this.workerQueue.shift();
        if (!nextJob) {
            worker.isReady = true;
            return;
        }

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
     * Sets the multiPv (number of lines) option. See https://disservin.github.io/stockfish-docs/stockfish-wiki/Terminology.html#multiple-pvs.
     * @param multiPv The number of lines to set.
     * @param forceInit If true, the option is set even if multiPv is equal to this.multiPv. If false, an error is thrown if the engine is not ready.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setMultiPv(multiPv: number, forceInit = false) {
        if (!forceInit) {
            if (multiPv === this.multiPv) return;

            this.throwErrorIfNotReady();
        }

        if (multiPv > ENGINE_LINE_COUNT.Max) {
            throw new Error(`Invalid MultiPV value : ${multiPv}`);
        }
        if (multiPv < 1) {
            multiPv = 1;
        }

        await this.sendCommandsToEachWorker([`setoption name MultiPV value ${multiPv}`, 'isready'], 'readyok');

        this.multiPv = multiPv;
    }

    /**
     * Sets the thread count for the engine.
     * @param threads The number of threads to use.
     * @param forceInit If true, the option is set even if threads is equal to this.threads.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setThreads(threads: number, forceInit = false) {
        if (!forceInit) {
            if (threads === this.threads) {
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (threads < ENGINE_THREADS.Min || threads > ENGINE_THREADS.Max) {
            throw new Error(
                `Invalid threads value (${threads}) is not in range [${ENGINE_THREADS.Min}, ${ENGINE_THREADS.Max}]`,
            );
        }
        await this.sendCommandsToEachWorker([`setoption name Threads value ${threads}`, 'isready'], 'readyok');
        this.threads = threads;
    }

    /**
     * Sets the hash size in MB for the engine.
     * @param hash The hash size in MB.
     * @param forceInit If true, the option is set even if hash is equal to this.hash.
     * @returns A Promise that resolves once the engine is ready.
     */
    private async setHash(hash: number, forceInit = false) {
        if (!forceInit) {
            if (hash === this.hash) {
                return;
            }
            this.throwErrorIfNotReady();
        }

        if (hash < Math.pow(2, ENGINE_HASH.Min) || hash > Math.pow(2, ENGINE_HASH.Max)) {
            throw new Error(
                `Invalid threads value (${hash}) is not in range [${Math.pow(2, ENGINE_HASH.Min)}, ${Math.pow(2, ENGINE_HASH.Max)}]`,
            );
        }
        await this.sendCommandsToEachWorker([`setoption name Hash value ${hash}`, 'isready'], 'readyok');
        this.hash = hash;
    }


    public getIsReady(): boolean {
        return this.isReady;
    }

    private throwErrorIfNotReady() {
        if (!this.isReady) {
            throw new Error(`${this.name} is not ready`);
        }
    }

    public shutdown(): void {
        this.isReady = false;
        this.workerQueue = [];

        for (const worker of this.workers) {
            this.terminateWorker(worker);
        }
        this.workers = [];
    }

    private terminateWorker(worker: EngineWorker) {
        this.engineDebug(`Terminating worker from ${this.enginePath}`)
        worker.isReady = false;
        worker.uci('quit');
        worker.terminate();
    }

    public async stopAllCurrentJobs(): Promise<void> {
        this.workerQueue = [];
        await this.sendCommandsToEachWorker(['stop', 'isready'], 'readyok');

        for (const worker of this.workers) {
            await this.releaseWorker(worker);
        }
    }

    private async sendCommands(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<string[]> {
        const worker = this.acquireWorker();

        if (!worker) {
            return new Promise((resolve) => {
                this.workerQueue.push({
                    commands,
                    finalMessage,
                    onNewMessage,
                    resolve,
                });
            });
        }

        const res = await sendCommandsToWorker(worker, commands, finalMessage, onNewMessage);

        await this.releaseWorker(worker);
        return res;
    }

    private async sendCommandsToEachWorker(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<void> {
        await Promise.all(
            this.workers.map(async (worker) => {
                await sendCommandsToWorker(worker, commands, finalMessage, onNewMessage);
                await this.releaseWorker(worker);
            }),
        );
    }

    private async addNewWorker() {
        const worker = getEngineWorker(this.enginePath);

        await sendCommandsToWorker(worker, ['uci'], 'uciok');
        await sendCommandsToWorker(
            worker,
            [`setoption name MultiPV value ${this.multiPv}`, 'isready'],
            'readyok',
        );
        await this.customEngineInit?.(worker);
        await sendCommandsToWorker(worker, ['ucinewgame', 'isready'], 'readyok');

        this.workers.push(worker);
        await this.releaseWorker(worker);
    }

    private async setWorkersNb(workersNb: number) {
        if (workersNb === this.workers.length) return;

        if (workersNb < 1) {
            throw new Error(`Number of workers must be greater than 0, got ${workersNb} instead`);
        }

        if (workersNb < this.workers.length) {
            const workersToRemove = this.workers.slice(workersNb);
            this.workers = this.workers.slice(0, workersNb);

            for (const worker of workersToRemove) {
                this.terminateWorker(worker);
            }
            return;
        }

        const workersNbToCreate = workersNb - this.workers.length;

        await Promise.all(new Array(workersNbToCreate).fill(0).map(() => this.addNewWorker()));
    }

    
    /**
     * Evaluates the given position, updating the eval as the engine runs.
     * @param fen The FEN to evaluate.
     * @param depth The depth to use when evaluating.
     * @param multiPv The number of lines to analyze.
     * @param setPartialEval The callback function that is sent eval updates.
     * @returns The engine's final PositionEval.
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

        this.engineDebug(`Evaluating position: ${fen}`)

        const results = await this.sendCommands(
            [`position fen ${fen}`, `go depth ${depth}`],
            'bestmove',
            onNewMessage,
        );

        return parseEvaluationResults(fen, results, whiteToPlay);
    }

    /**
     * Passes the given message and params to console.debug if this._debug is true.
     * @param message The message to pass to console.debug.
     * @param optionalParams The optionalParams to pass to console.debug.
     */
    private engineDebug(message?: unknown, ...optionalParams: unknown[]) {
        if (this._debug) {
            debug(message, optionalParams);
        }
    }
}
