// import { getConfig } from '@/config';
import { EngineWorker, WorkerJob, getEngineWorker, sendCommandsToWorker } from './EngineWorker';
import { ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_THREADS, EngineName, EvaluatePositionWithUpdateParams, PositionEval } from './engine';
import { parseEvaluationResults } from './parseResults';
import { debug } from './helper';
// import { truncate } from 'fs';

// const config = getConfig();

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
        debug = true,
    ): Promise<UciEngineFactory> {
        const engine = new UciEngineFactory(engineName, enginePath, customEngineInit, debug);
        engine.engineDebug(`Creating engine: ${engineName} from path: ${enginePath}`);

        await engine.addNewWorker();
        engine.isReady = true;
        engine.engineDebug(`Engine ${engineName} is ready`);

        return engine;
    }

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

    private async releaseWorker(worker: EngineWorker) {
        const nextJob = this.workerQueue.shift();
        if (!nextJob) {
            worker.isReady = true;
            this.engineDebug(`Worker released, available workers: ${this.workers.filter(w => w.isReady).length}`);
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
        await this.sendCommandsToEachWorker([`setoption name MultiPV value ${multiPv}`, 'isready'], 'readyok');

        this.multiPv = multiPv;
    }

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
        await this.sendCommandsToEachWorker([`setoption name Threads value ${threads}`, 'isready'], 'readyok');
        this.threads = threads;
    }

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
        this.engineDebug(`Shutting down engine, terminating ${this.workers.length} workers`);
        this.isReady = false;
        this.workerQueue = [];

        for (const worker of this.workers) {
            this.terminateWorker(worker);
        }
        this.workers = [];
        this.engineDebug('Engine shutdown complete');
    }

    private terminateWorker(worker: EngineWorker) {
        this.engineDebug(`Terminating worker from ${this.enginePath}`);
        worker.isReady = false;
        worker.uci('quit');
        worker.terminate();
    }

    public async stopAllCurrentJobs(): Promise<void> {
        this.engineDebug(`Stopping all jobs, queue size: ${this.workerQueue.length}`);
        this.workerQueue = [];
        await this.sendCommandsToEachWorker(['stop', 'isready'], 'readyok');

        for (const worker of this.workers) {
            await this.releaseWorker(worker);
        }
        this.engineDebug('All jobs stopped');
    }

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

    private async sendCommandsToEachWorker(
        commands: string[],
        finalMessage: string,
        onNewMessage?: (messages: string[]) => void,
    ): Promise<void> {
        this.engineDebug(`Broadcasting commands to ${this.workers.length} workers: ${commands.join(', ')}`);
        await Promise.all(
            this.workers.map(async (worker) => {
                await sendCommandsToWorker(worker, commands, finalMessage, onNewMessage);
                await this.releaseWorker(worker);
            }),
        );
    }

    private async addNewWorker() {
        this.engineDebug(`Adding new worker for engine at ${this.enginePath}`);
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
        this.engineDebug(`Worker added, total workers: ${this.workers.length}`);
        await this.releaseWorker(worker);
    }

    public async evaluatePositionWithUpdate({
        fen,
        depth = ENGINE_DEPTH.Default,
        multiPv = this.multiPv,
        threads = ENGINE_THREADS.Default,
        hash = Math.pow(2, ENGINE_HASH.Default),
        setPartialEval,
    }: EvaluatePositionWithUpdateParams): Promise<PositionEval> {
        this.throwErrorIfNotReady();

        this.engineDebug(`Starting evaluation: depth=${depth}, multiPv=${multiPv}, threads=${threads}, hash=${hash}`);
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

    private engineDebug(message?: unknown, ...optionalParams: unknown[]) {
        if (this._debug) {
            debug(message, optionalParams);
        }
    }
}
