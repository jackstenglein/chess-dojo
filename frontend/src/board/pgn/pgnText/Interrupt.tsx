import { useAuth } from '@/auth/Auth';
import useGame from '@/context/useGame';
import { Move } from '@jackstenglein/chess';
import { Divider, Grid, Paper } from '@mui/material';
import { useLocalStorage } from 'usehooks-ts';
import { getInlineCommentsForMove } from '../boardTools/underboard/comments/positionComments';
import {
    isSuggestedVariation,
    isVariationSuggestor,
} from '../boardTools/underboard/comments/suggestVariation';
import {
    ShowInlineCommentsInPgn,
    ShowSuggestedVariations,
} from '../boardTools/underboard/settings/ViewerSettings';
import { useChess } from '../PgnBoard';
import { Comments } from './Comments';
import { Ellipsis } from './Ellipsis';
import Lines from './Lines';

export function hasInterrupt(
    move: Move,
    showSuggestedVariations: boolean,
    username: string | undefined,
    hasInlineComments = false,
): boolean {
    return (
        hasInlineComments ||
        (move.commentAfter?.trim().length || 0) > 0 ||
        move.variations.some(
            (v) =>
                v.length > 0 &&
                (showSuggestedVariations ||
                    !isSuggestedVariation(v[0]) ||
                    isVariationSuggestor(username, v[0])),
        )
    );
}

interface InterruptProps {
    move: Move;
    handleScroll: (child: HTMLElement | null) => void;
}

const Interrupt: React.FC<InterruptProps> = ({ move, handleScroll }) => {
    const { user } = useAuth();
    const { chess } = useChess();
    const { game } = useGame();
    const [showSuggestedVariations] = useLocalStorage<boolean>(
        ShowSuggestedVariations.key,
        ShowSuggestedVariations.default,
    );
    const [showInlineCommentsInPgn] = useLocalStorage<boolean>(
        ShowInlineCommentsInPgn.key,
        ShowInlineCommentsInPgn.default,
    );
    const inlineComments = showInlineCommentsInPgn
        ? getInlineCommentsForMove(game, chess, move)
        : [];

    if (!hasInterrupt(move, showSuggestedVariations, user?.username, inlineComments.length > 0)) {
        return null;
    }

    return (
        <>
            {move.ply % 2 === 1 && <Ellipsis ply={move.ply} />}
            <Grid size={12}>
                <Paper elevation={3} sx={{ boxShadow: 'none', color: 'text.secondary' }}>
                    <Divider
                        sx={{
                            position: 'relative',
                            overflow: 'visible',
                            backgroundColor: 'inherit',
                            backgroundImage: 'inherit',

                            '&:after': {
                                position: 'absolute',
                                content: '""',
                                borderLeft: '1px solid',
                                borderTop: '1px solid',
                                borderColor: 'inherit',
                                borderBottomRightRadius: '14px',
                                width: '10px',
                                height: '10px',
                                zIndex: 1,
                                top: '-5px',
                                left: {
                                    xs: `calc(100% * ${move.ply % 2 ? '2 / 12' : '7 / 12'} + 5px)`,
                                    md: `calc(100% * ${move.ply % 2 ? '2 / 12' : '7 / 12'} + 5px)`,
                                },
                                transform: 'rotate(45deg)',
                                backgroundColor: 'inherit',
                                backgroundImage: 'inherit',
                            },
                        }}
                    />

                    <Comments move={move} inlineComments={inlineComments} />

                    <Lines lines={move.variations} handleScroll={handleScroll} />

                    <Divider />
                </Paper>
            </Grid>
        </>
    );
};

export default Interrupt;
