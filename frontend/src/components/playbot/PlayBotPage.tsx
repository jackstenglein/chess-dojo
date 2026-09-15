'use client';

import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import { CustomUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import PgnBoard, { PgnBoardApi } from '@/board/pgn/PgnBoard';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { Chess, FEN } from '@jackstenglein/chess';
import { SmartToy } from '@mui/icons-material';
import { Box } from '@mui/material';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MAIA_RATINGS, MaiaRating } from './maiaengine';
import { PlayBotAfterPgn } from './PlayBotAfterPgn';
import { PlayBotControls } from './PlayBotControls';
import { PlayBotSetup, PlayBotStartOpts, TimeControl } from './PlayBotSetup';
import { useMaiaGame } from './useMaiaGame';

type PageView = 'setup' | 'playing';

function parseQueryOpts(searchParams: URLSearchParams): PlayBotStartOpts | null {
    const fen = searchParams.get('fen');
    if (!fen) return null;

    const minsStr = searchParams.get('mins');
    const incStr = searchParams.get('inc');
    const colorStr = searchParams.get('color');

    const mins = parseFloat(minsStr ?? '0') || 0;
    const inc = parseFloat(incStr ?? '0') || 0;

    const timeControl: TimeControl = {
        initialMs: mins * 60 * 1000,
        incrementMs: inc * 1000,
    };

    const playerColor: 'white' | 'black' = colorStr === 'black' ? 'black' : 'white';

    const ratingStr = searchParams.get('rating');
    const ratingNum = parseInt(ratingStr ?? '1500');
    const validRatings: MaiaRating[] = MAIA_RATINGS;
    const maiaRating: MaiaRating = (
        validRatings.includes(ratingNum as MaiaRating) ? ratingNum : 1500
    ) as MaiaRating;

    return { playerColor, maiaRating, startFen: fen.trim(), timeControl };
}

interface PlayBotAutoStartProps {
    maiaGame: ReturnType<typeof useMaiaGame>;
    setView: (v: PageView) => void;
    setActiveRating: (r: MaiaRating) => void;
    setBoardFen: (f: string) => void;
    setBoardOrientation: (o: 'white' | 'black') => void;
    setInitKey: React.Dispatch<React.SetStateAction<number>>;
    autoStartedRef: React.RefObject<boolean>;
}

function PlayBotAutoStart({
    maiaGame,
    setView,
    setActiveRating,
    setBoardFen,
    setBoardOrientation,
    setInitKey,
    autoStartedRef,
}: PlayBotAutoStartProps) {
    const { searchParams } = useNextSearchParams();

    useEffect(() => {
        if (autoStartedRef.current) return;

        const opts = parseQueryOpts(searchParams);
        if (!opts) return;

        autoStartedRef.current = true;
        setActiveRating(opts.maiaRating);
        setBoardFen(opts.startFen);
        setBoardOrientation(opts.playerColor);
        maiaGame.startGame(opts);
        setView('playing');
        setInitKey((k) => k + 1);
    }, [
        searchParams,
        maiaGame,
        autoStartedRef,
        setActiveRating,
        setBoardFen,
        setBoardOrientation,
        setView,
        setInitKey,
    ]);

    return null;
}

export function PlayBotPage() {
    const maiaGame = useMaiaGame();

    const [view, setView] = useState<PageView>('setup');
    const [activeRating, setActiveRating] = useState<MaiaRating>(1500);
    const [boardFen, setBoardFen] = useState<string>(FEN.start);
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
    const [initKey, setInitKey] = useState(0);

    const pgnBoardRef = useRef<PgnBoardApi>(null);
    const autoStartedRef = useRef(false);

    const onInitialize = useCallback(
        (board: BoardApi, chess: Chess) => {
            maiaGame.onBoardInit(board, chess);
        },
        [maiaGame],
    );

    const onMove = useCallback(
        (board: BoardApi, chess: Chess, primitive: PrimitiveMove) => {
            if (view !== 'playing') return;
            if (maiaGame.result === null && !maiaGame.playerToMove) return;
            if (maiaGame.result === null && chess.currentMove() !== chess.lastMove()) return;

            const uci = primitive.orig + primitive.dest + (primitive.promotion ?? '');
            const moved = chess.move(uci);
            if (!moved) return;
            reconcile(chess, board);
            maiaGame.onPlayerMoved(uci);
        },
        [view, maiaGame],
    );

    const handleStart = useCallback(
        (opts: PlayBotStartOpts) => {
            const fen = opts.startFen || FEN.start;
            setActiveRating(opts.maiaRating);
            setBoardFen(fen);
            setBoardOrientation(opts.playerColor);
            maiaGame.startGame(opts);
            setView('playing');
            setInitKey((k) => k + 1);
        },
        [maiaGame],
    );

    const handleNewGame = useCallback(() => {
        setView('setup');
        setBoardFen(FEN.start);
        setBoardOrientation('white');
        setInitKey((k) => k + 1);
    }, []);

    const controlsTab: CustomUnderboardTab = {
        name: view === 'setup' ? 'Setup' : 'Game',
        tooltip: view === 'setup' ? 'Game Setup' : 'Game Controls',
        icon: <SmartToy fontSize='small' />,
        element:
            view === 'setup' ? (
                <Box sx={{ p: 1.5, overflowY: 'auto', height: '100%' }}>
                    <PlayBotSetup onStart={handleStart} initialRating={activeRating} />
                </Box>
            ) : (
                <PlayBotControls
                    game={maiaGame}
                    maiaRating={activeRating}
                    onNewGame={handleNewGame}
                />
            ),
    };

    return (
        <Box sx={{ pt: { xs: 1, sm: 2 } }}>
            <Suspense fallback={null}>
                <PlayBotAutoStart
                    maiaGame={maiaGame}
                    setView={setView}
                    setActiveRating={setActiveRating}
                    setBoardFen={setBoardFen}
                    setBoardOrientation={setBoardOrientation}
                    setInitKey={setInitKey}
                    autoStartedRef={autoStartedRef}
                />
            </Suspense>

            <PgnBoard
                ref={pgnBoardRef}
                key={initKey}
                fen={boardFen}
                startOrientation={boardOrientation}
                underboardTabs={[controlsTab]}
                initialUnderboardTab={controlsTab.name}
                showPlayerHeaders={false}
                disableEngine
                disableNullMoves
                initKey={String(initKey)}
                slotProps={{
                    board: {
                        onMove: view === 'playing' ? onMove : undefined,
                    },
                }}
                slots={{
                    afterPgnText: (
                        <PlayBotAfterPgn game={maiaGame} view={view} maiaRating={activeRating} />
                    ),
                }}
                onInitialize={onInitialize}
            />
        </Box>
    );
}
