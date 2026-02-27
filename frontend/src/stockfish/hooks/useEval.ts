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
    SavedEval,
    SavedEvals,
} from '../engine/engine';
import { getEvalCache, makeEvalCacheKey, setEvalCache } from './evalCache';
import { useEngine } from './useEngine';

export function useEval(enabled: boolean, engineName?: EngineName): PositionEval | undefined {
    const [currentPosition, setCurrentPosition] = useState<PositionEval>();
    const { chess } = useChess();
    const engine = useEngine(enabled, engineName);
    const [depth] = useLocalStorage(ENGINE_DEPTH.Key, ENGINE_DEPTH.Default);
    const [multiPv] = useLocalStorage(ENGINE_LINE_COUNT.Key, ENGINE_LINE_COUNT.Default);
    const [threads, setThreads] = useLocalStorage(ENGINE_THREADS.Key, ENGINE_THREADS.Default);
    const [hash] = useLocalStorage(ENGINE_HASH.Key, ENGINE_HASH.Default);

    const memCache = useRef<SavedEvals>({});

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
        if (!enabled || !chess || !engine || !engineName) return;

        if (!engine?.isReady()) {
            logger.error?.(`Engine ${engineName} not ready`);
        }

        const resolvedThreads = threads || navigator.hardwareConcurrency || 4;

        const evaluate = async () => {
            setCurrentPosition(undefined);
            const fen = chess.fen();
            const cacheKey = makeEvalCacheKey(fen, engineName);

            // L1 – in-memory (fastest, no async I/O, lives for component lifetime)
            const memHit = memCache.current[fen];
            if (
                memHit?.engine === engineName &&
                memHit.lines.length >= multiPv &&
                memHit.lines[0]?.depth >= depth
            ) {
                setCurrentPosition(memHit);
                return;
            }

            // L2 – IndexedDB (survives page reload; only contains fully-completed evals)
            const idbHit = await getEvalCache(cacheKey);
            if (idbHit) {
                memCache.current[fen] = idbHit;
                setCurrentPosition(idbHit);
                return;
            }

            try {
                const rawPositionEval = await engine.evaluatePositionWithUpdate({
                    fen,
                    depth,
                    multiPv,
                    threads: resolvedThreads,
                    hash: Math.pow(2, hash),
                    setPartialEval: (positionEval: PositionEval) => {
                        if (positionEval.lines[0]?.fen === chess.fen()) {
                            setCurrentPosition(positionEval);
                        }
                    },
                });

                const finalEval: SavedEval = { ...rawPositionEval, engine: engineName };

                // Only cache once the engine has reached the full requested depth
                if (finalEval.lines.length >= multiPv && finalEval.lines[0]?.depth >= depth) {
                    memCache.current[fen] = finalEval;

                    void setEvalCache(cacheKey, finalEval);
                }
            } catch (err) {
                if (err !== E_CANCELED) throw err;
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
