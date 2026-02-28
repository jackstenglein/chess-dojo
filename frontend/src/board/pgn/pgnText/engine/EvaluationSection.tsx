import { ChessDbPv } from '@/api/cache/chessdb';
import { normalizeChessDBScore } from '@/api/chessdbService';
import Board from '@/board/Board';
import { CLOUD_EVAL_ENABLED, EngineInfo, LineEval } from '@/stockfish/engine/engine';
import CloudIcon from '@mui/icons-material/Cloud';
import { List, Paper, Popper, Tooltip } from '@mui/material';
import { Chess } from 'chess.js';
import { Key } from 'chessground/types';
import { useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { ChessContext, useChess } from '../../PgnBoard';
import LineEvaluation from './LineEval';

interface HoverMove {
    fen: string;
    from: Key;
    to: Key;
}

/**
 * Converts a given chessDB pv into Line eval, again we have to normalize cp to match engine lines
 * @param pv ChessDv pv
 * @param fen current FEN
 * @returns converted Line eval
 */
function chessDbPvToLineEval(pv: ChessDbPv, fen: string): LineEval {
    const side = new Chess(fen).turn();
    return {
        fen,
        depth: pv.depth,
        cp: normalizeChessDBScore(pv.score, side),
        mate: undefined,
        pv: pv.pv,
        multiPv: 1,
        resultPercentages: undefined,
    };
}

export const EvaluationSection = ({
    engineInfo,
    allLines,
    maxLines,
    chessDbpv,
    chessDbLoading,
}: {
    engineInfo: EngineInfo;
    allLines: LineEval[];
    maxLines: number;
    chessDbpv: ChessDbPv | null;
    chessDbLoading: boolean;
}) => {
    const anchorRef = useRef<HTMLUListElement>(null);
    const [hoverMove, setHoverMove] = useState<HoverMove>();
    const { board } = useChess();
    const [cloudEvalEnabled] = useLocalStorage(CLOUD_EVAL_ENABLED.Key, CLOUD_EVAL_ENABLED.Default);

    const onMouseOver = (event: React.MouseEvent<HTMLElement>) => {
        const element = event.target as HTMLElement;
        if (element.dataset.fen && element.dataset.from && element.dataset.to) {
            setHoverMove({
                fen: element.dataset.fen,
                from: element.dataset.from as Key,
                to: element.dataset.to as Key,
            });
        }
    };

    const onMouseLeave = () => {
        setHoverMove(undefined);
    };

    return (
        <>
            <List
                ref={anchorRef}
                sx={{ pb: 0 }}
                onMouseOver={onMouseOver}
                onMouseLeave={onMouseLeave}
            >
                {cloudEvalEnabled && (
                    <CloudEvalSection
                        pv={chessDbpv}
                        loading={chessDbLoading}
                        engineInfo={engineInfo}
                    />
                )}
                {Array.from({ length: maxLines }).map((_, i) => (
                    <LineEvaluation
                        engineInfo={engineInfo}
                        key={i}
                        line={allLines[i]}
                        isTop={i === 0}
                    />
                ))}
            </List>

            <Popper
                open={Boolean(anchorRef.current && hoverMove)}
                anchorEl={anchorRef.current}
                placement='bottom'
                sx={{ zIndex: '1300' }}
            >
                {hoverMove && (
                    <Paper
                        elevation={12}
                        sx={{
                            width:
                                Math.floor(
                                    (anchorRef.current?.getBoundingClientRect().width ?? 0) / 4,
                                ) * 4,
                            maxWidth: '368px',
                            aspectRatio: '1 / 1',
                            overflow: 'hidden',
                        }}
                    >
                        <ChessContext.Provider value={{ config: { initKey: hoverMove.fen } }}>
                            <Board
                                config={{
                                    fen: hoverMove.fen,
                                    lastMove: [hoverMove.from, hoverMove.to],
                                    viewOnly: true,
                                    orientation: board?.state.orientation,
                                }}
                            />
                        </ChessContext.Provider>
                    </Paper>
                )}
            </Popper>
        </>
    );
};

const cloudIcon = (
    <Tooltip title='Chess Cloud Database' disableInteractive>
        <CloudIcon sx={{ fontSize: '0.75rem' }} />
    </Tooltip>
);

function CloudEvalSection({
    pv,
    loading,
    engineInfo,
}: {
    pv: ChessDbPv | null;
    loading: boolean;
    engineInfo: EngineInfo;
}) {
    const { chess } = useChess();
    const currentFen = chess?.fen() ?? '';

    if (!loading && !pv) {
        return null;
    }

    const line = pv
        ? chessDbPvToLineEval(pv, currentFen)
        : {
              fen: currentFen,
              depth: 0,
              pv: [],
              cp: undefined,
              mate: undefined,
              multiPv: 1,
              resultPercentages: undefined,
          };

    return <LineEvaluation engineInfo={engineInfo} line={line} icon={cloudIcon} />;
}
