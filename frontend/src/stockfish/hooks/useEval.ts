import { useChess } from '@/board/pgn/PgnBoard';
import { logger } from '@/logging/logger';
import { EventType } from '@jackstenglein/chess';
import { E_CANCELED } from 'async-mutex';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    ENGINE_DEPTH,
    ENGINE_HASH,
    ENGINE_LINE_COUNT,
    ENGINE_THREADS,
    EngineName,
    PositionEval,
    SavedEvals,
} from '../engine/engine';
import { useEngine } from './useEngine';

export function useEval(enabled: boolean, engineName?: EngineName): PositionEval | undefined {
    const [currentPosition, setCurrentPosition] = useState<PositionEval>();
    const { chess } = useChess();
    const engine = useEngine(enabled, engineName);
    const [depth] = useLocalStorage(ENGINE_DEPTH.Key, ENGINE_DEPTH.Default);
    const [multiPv] = useLocalStorage(ENGINE_LINE_COUNT.Key, ENGINE_LINE_COUNT.Default);
    const [threads, setThreads] = useLocalStorage(ENGINE_THREADS.Key, ENGINE_THREADS.Default);
    const [hash] = useLocalStorage(ENGINE_HASH.Key, ENGINE_HASH.Default);
    const savedEvals = useRef<SavedEvals>({});

    useEffect(() => {
        if (!ENGINE_THREADS.Default) {
            ENGINE_THREADS.Default = threads || navigator.hardwareConcurrency;
            ENGINE_THREADS.Max = navigator.hardwareConcurrency;
        }
        if (threads === 0) {
            setThreads(navigator.hardwareConcurrency);
        }
    }, [threads, setThreads]);

    useEffect(() => {
        if (!chess || !engineName) {
            return;
        }

        if (enabled && engine) {
            if (!engine.isReady()) {
                logger.error?.(`Engine ${engineName} not ready`);
            }
        }

        const evaluate = async () => {
            const fen = chess.fen();
            const savedEval = savedEvals.current[fen];

            if (savedEval?.engine === engineName) {
                const meetsDepth =
                    savedEval.lines.length >= multiPv && savedEval.lines[0].depth >= depth;

                // When disabled, show whatever was previously evaluated.
                // When enabled, only reuse if the saved eval meets the
                // current depth/line requirements.
                if (meetsDepth || !enabled) {
                    setCurrentPosition(savedEval);
                    return;
                }
            }

            if (enabled && engine) {
                setCurrentPosition(undefined);
                try {
                    const rawPositionEval = await engine.evaluatePositionWithUpdate({
                        fen,
                        depth,
                        multiPv,
                        threads: threads || 4,
                        hash: Math.pow(2, hash),
                        setPartialEval: (positionEval: PositionEval) => {
                            if (positionEval.lines[0]?.fen === chess.fen()) {
                                setCurrentPosition(positionEval);
                                savedEvals.current[fen] = {
                                    ...positionEval,
                                    engine: engineName,
                                };
                            }
                        },
                    });

                    savedEvals.current[fen] = { ...rawPositionEval, engine: engineName };
                } catch (err) {
                    if (err !== E_CANCELED) {
                        throw err;
                    }
                }
            }
        };
        const observer = {
            types: [EventType.Initialized, EventType.LegalMove],
            handler: evaluate,
        };

        void evaluate();
        chess.addObserver(observer);

        return () => {
            void engine?.stopSearch();
            chess.removeObserver(observer);
        };
    }, [enabled, chess, depth, engine, engineName, multiPv, threads, hash, setCurrentPosition]);

    return currentPosition;
}
