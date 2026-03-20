import {
    ChessDbCacheEntry,
    ChessDbMove,
    ChessDbPv,
    getChessDbCache,
    setChessDbCacheEntry,
} from '@/api/cache/chessdb';
import { ChessDBService } from '@/api/chessdbService';
import { useChess } from '@/board/pgn/PgnBoard';
import { EventType } from '@jackstenglein/chess';
import { validateFen } from 'chess.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useChessDB({ enableMoves, enablePv }: { enableMoves: boolean; enablePv: boolean }) {
    const { chess } = useChess();
    const [data, setData] = useState<ChessDbMove[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [queueing, setQueueing] = useState(false);
    const [pv, setPv] = useState<ChessDbPv | null>(null);
    const [pvLoading, setPvLoading] = useState(false);

    const chessDbService = useMemo(() => new ChessDBService(), []);

    const queueAnalysis = useCallback(
        async (fenString: string): Promise<void> => {
            if (!fenString.trim() || !validateFen(fenString)) return;

            try {
                setQueueing(true);
                await chessDbService.queueAnalysis(fenString);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to queue analysis');
            } finally {
                setQueueing(false);
            }
        },
        [chessDbService],
    );

    const fetchPv = useCallback(
        async (fenString: string): Promise<ChessDbPv | null> => {
            if (!fenString.trim() || !validateFen(fenString)) return null;

            setPvLoading(true);

            try {
                const cached = await getChessDbCache(fenString);
                if (cached?.pv?.fen) {
                    setPv(cached.pv);
                    return cached.pv;
                }

                const pvData = await chessDbService.getPv(fenString);

                if (pvData.data) {
                    await setChessDbCacheEntry(fenString, { pv: pvData.data });
                    setPv(pvData.data);
                    return pvData.data;
                } else {
                    throw new Error(pvData.error);
                }
            } catch {
                setPv(null);
                return null;
            } finally {
                setPvLoading(false);
            }
        },
        [chessDbService],
    );

    const fetchChessDBData = useCallback(
        async (fenString: string): Promise<ChessDbMove[]> => {
            if (!fenString.trim()) {
                setData([]);
                setError(null);
                return [];
            }
            if (!validateFen(fenString)) {
                setError('Invalid FEN provided');
                setData([]);
                return [];
            }

            setLoading(true);
            setError(null);

            try {
                const cached = (await getChessDbCache(fenString)) as ChessDbCacheEntry | null;
                if (cached?.moves) {
                    setData(cached.moves);
                    return cached.moves;
                }

                const chessDbMoves = await chessDbService.getAnalysis(fenString);
                if (chessDbMoves.data) {
                    await setChessDbCacheEntry(fenString, { moves: chessDbMoves.data.moves });
                    setData(chessDbMoves.data.moves);
                    return chessDbMoves.data.moves;
                } else {
                    await queueAnalysis(fenString);
                    throw new Error(chessDbMoves.error);
                }
            } catch (err) {
                setData([]);
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
                return [];
            } finally {
                setLoading(false);
            }
        },
        [queueAnalysis, chessDbService],
    );

    useEffect(() => {
        if (!enableMoves && !enablePv) return;
        if (!chess) return;

        const onMove = () => {
            const fen = chess.fen();
            if (enableMoves) {
                void fetchChessDBData(fen);
            }
            if (enablePv) {
                void fetchPv(fen);
            }
        };
        onMove();

        const observer = {
            types: [EventType.Initialized, EventType.LegalMove],
            handler: onMove,
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [fetchChessDBData, fetchPv, enableMoves, enablePv, chess]);

    return {
        data,
        loading,
        error,
        queueing,
        fetchChessDBData,
        queueAnalysis,
        pv,
        pvLoading,
        fetchPv,
    };
}
