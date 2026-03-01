import { debug, isIosDevice, isMobileDevice } from './helper';

export interface EngineWorker {
    isReady: boolean;
    uci(command: string): void;
    listen: (data: string) => void;
    terminate: () => void;
}

export interface WorkerJob {
    commands: string[];
    finalMessage: string;
    onNewMessage?: (messages: string[]) => void;
    resolve: (messages: string[]) => void;
}

export const getEngineWorker = (enginePath: string): EngineWorker => {
    debug(`Creating worker from ${enginePath}`);

    const worker = new window.Worker(enginePath);

    const engineWorker: EngineWorker = {
        isReady: false,
        uci: (command: string) => {
            debug(`Sending command to worker: ${command}`);
            worker.postMessage(command);
        },
        listen: () => null,
        terminate: () => {
            debug('Terminating worker');
            worker.terminate();
        },
    };

    worker.onmessage = (event) => {
        debug(`Worker message received: ${event.data}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        engineWorker.listen(event.data);
    };

    worker.onerror = (error) => {
        debug(`Worker error: ${error.message}`);
    };

    return engineWorker;
};

export const sendCommandsToWorker = (
    worker: EngineWorker,
    commands: string[],
    finalMessage: string,
    onNewMessage?: (messages: string[]) => void,
): Promise<string[]> => {
    return new Promise((resolve) => {
        const messages: string[] = [];
        debug(`Sending ${commands.length} commands to worker, waiting for: ${finalMessage}`);

        worker.listen = (data) => {
            messages.push(data);
            debug(`Collected message (${messages.length}): ${data}`);
            onNewMessage?.(messages);

            if (data.startsWith(finalMessage)) {
                debug(`Final message received. Total messages: ${messages.length}`);
                resolve(messages);
            }
        };

        for (const command of commands) {
            worker.uci(command);
        }
    });
};

export const getRecommendedWorkersNb = (): number => {
    const maxWorkersNbFromThreads = Math.max(
        1,
        Math.round(navigator.hardwareConcurrency - 4),
        Math.floor((navigator.hardwareConcurrency * 2) / 3),
    );

    const maxWorkersNbFromMemory =
        'deviceMemory' in navigator && typeof navigator.deviceMemory === 'number'
            ? Math.max(1, Math.round(navigator.deviceMemory))
            : 4;

    const maxWorkersNbFromDevice = isIosDevice() ? 2 : isMobileDevice() ? 4 : 8;

    return Math.min(maxWorkersNbFromThreads, maxWorkersNbFromMemory, maxWorkersNbFromDevice);
};
