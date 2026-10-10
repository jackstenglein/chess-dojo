import { useChess } from '@/board/pgn/PgnBoard';
import { HideEngine } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { EngineControlContext } from '@/board/pgn/pgnText/engine/EngineControl';
import { Color, EventType } from '@jackstenglein/chess';
import { Biotech, Memory, SmartToy } from '@mui/icons-material';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

/**
 * The reader's buttons at the right end of the row under the board: the engine toggle, and
 * the current position on the bot page and on the analysis board, each in a new tab.
 */
export function StudyBoardActions() {
    const t = useTranslations('study.board');
    const { chess } = useChess();
    const engine = useContext(EngineControlContext);
    // The viewer setting removes the strip everywhere, so the button would have nothing to show.
    const [hideEngine] = useLocalStorage(HideEngine.Key, HideEngine.Default);
    const [, setPosition] = useState(0);

    // The links carry the position as rendered, so they follow the board's moves.
    useEffect(() => {
        if (!chess) return;
        const observer = {
            types: [EventType.Initialized, EventType.LegalMove],
            handler: () => setPosition((v) => v + 1),
        };
        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [chess]);

    if (!chess) return null;
    const fen = chess.fen();
    const color = chess.turn() === Color.black ? 'black' : 'white';

    return (
        <Stack direction='row' data-testid='study-board-actions'>
            {engine && !hideEngine && (
                <Tooltip title={t('engine')}>
                    <IconButton
                        aria-label={t('engine')}
                        aria-pressed={engine.enabled}
                        onClick={() => engine.setEnabled(!engine.enabled)}
                        data-testid='study-engine-toggle'
                    >
                        <Memory
                            sx={{ color: engine.enabled ? 'primary.main' : 'text.secondary' }}
                        />
                    </IconButton>
                </Tooltip>
            )}
            <Tooltip title={t('playBot')}>
                <IconButton
                    aria-label={t('playBot')}
                    href={`/play-bot?${new URLSearchParams({ fen, color }).toString()}`}
                    target='_blank'
                    rel='noopener'
                    data-testid='study-play-bot'
                >
                    <SmartToy sx={{ color: 'text.secondary' }} />
                </IconButton>
            </Tooltip>
            <Tooltip title={t('analyze')}>
                <IconButton
                    aria-label={t('analyze')}
                    href={`/games/analysis?${new URLSearchParams({ fen }).toString()}`}
                    target='_blank'
                    rel='noopener'
                    data-testid='study-analyze'
                >
                    <Biotech sx={{ color: 'text.secondary' }} />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}
