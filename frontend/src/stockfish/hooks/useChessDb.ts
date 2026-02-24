import {
    ChessDbCacheEntry,
    ChessDbMove,
    ChessDbPv,
    getChessDbCache,
    setChessDbMovesCache,
    setChessDbPvCache,
} from '@/api/cache/chessdb';
import { ChessDBService } from '@/api/chessdbService';
import { useChess } from '@/board/pgn/PgnBoard';
import { validateFen } from 'chess.js';
import { useCallback, useEffect, useMemo, useState } from 'react';


export function useChessDB() {
    const { chess } = useChess();
    const [data, setData] = useState<ChessDbMove[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [queueing, setQueueing] = useState(false);
    const [pv, setPv] = useState<ChessDbPv | null>(null);
    const [pvLoading, setPvLoading] = useState(false);
    const [pvError, setPvError] = useState<string | null>(null);

    const fen = chess?.fen() ?? '';
    const chessDbService = useMemo(() => new ChessDBService(), []);

    const queueAnalysis = useCallback(async (fenString: string): Promise<void> => {
        if (!fenString.trim() || !validateFen(fenString)) return;
        setQueueing(true);
        try {
            await chessDbService.queueAnalysis(fen);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to queue analysis');
        } finally {
            setQueueing(false);
        }
    }, [chessDbService, fen]);

    const fetchPv = useCallback(async (fenString: string): Promise<ChessDbPv | null> => {
        if (!fenString.trim() || !validateFen(fenString)) return null;

        setPvLoading(true);
        setPvError(null);

        try {
            const cached = await getChessDbCache(fenString);
            if (cached?.pv) {
                setPv(cached.pv);
                return cached.pv;
            }

            const pvData = await chessDbService.getPv(fenString)

            if(pvData.data){
            await setChessDbPvCache(fenString, pvData.data);
            setPv(pvData.data);
            return pvData.data;
            }else{
                throw new Error(pvData.error);
            }
            
        } catch (err) {
            setPvError(err instanceof Error ? err.message : 'Failed to fetch PV');
            setPv(null);
            return null;
        } finally {
            setPvLoading(false);
        }
    }, [chessDbService]);

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

                if(chessDbMoves.data){
                    await setChessDbMovesCache(fenString, chessDbMoves.data.moves);
                    setData(chessDbMoves.data.moves);
                    return chessDbMoves.data.moves;
                }else{
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
        if (!chess || !fen) return;
        void fetchChessDBData(fen);
        void fetchPv(fen);
    }, [fen, chess, fetchChessDBData, fetchPv]);

    const refetch = useCallback(() => {
        if (!fen) return;
        void fetchChessDBData(fen);
        void fetchPv(fen);
    }, [fen, fetchChessDBData, fetchPv]);

    const requestAnalysis = useCallback(() => {
        if (!fen) return;
        void queueAnalysis(fen);
    }, [fen, queueAnalysis]);

    const refetchPv = useCallback(() => {
        if (!fen) return;
        void fetchPv(fen);
    }, [fen, fetchPv]);

    return {
        data,
        loading,
        error,
        queueing,
        fetchChessDBData,
        refetch,
        requestAnalysis,
        pv,
        pvLoading,
        pvError,
        fetchPv,
        refetchPv,
    };
}
