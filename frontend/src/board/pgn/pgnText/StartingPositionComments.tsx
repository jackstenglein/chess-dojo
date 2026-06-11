import useGame from '@/context/useGame';
import { Divider, Paper } from '@mui/material';
import { useLocalStorage } from 'usehooks-ts';
import { getInlineCommentsForStartingPosition } from '../boardTools/underboard/comments/positionComments';
import { ShowInlineCommentsInPgn } from '../boardTools/underboard/settings/ViewerSettings';
import { useChess } from '../PgnBoard';
import InlinePositionComments from './InlinePositionComments';

export default function StartingPositionComments() {
    const { chess } = useChess();
    const { game } = useGame();
    const [showInlineCommentsInPgn] = useLocalStorage<boolean>(
        ShowInlineCommentsInPgn.key,
        ShowInlineCommentsInPgn.default,
    );
    const comments = showInlineCommentsInPgn
        ? getInlineCommentsForStartingPosition(game, chess)
        : [];

    if (comments.length === 0) {
        return null;
    }

    return (
        <Paper elevation={3} sx={{ boxShadow: 'none', color: 'text.secondary' }}>
            <InlinePositionComments comments={comments} />
            <Divider />
        </Paper>
    );
}
