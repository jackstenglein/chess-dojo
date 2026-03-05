import { debug } from './helper';

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
            worker.postMessage(command);
        },
        listen: () => null,
        terminate: () => {
            worker.terminate();
        },
    };

    worker.onmessage = (event) => {
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
            onNewMessage?.(messages);

            if (data.startsWith(finalMessage)) {
                resolve(messages);
            }
        };

        for (const command of commands) {
            worker.uci(command);
        }
    });
};
