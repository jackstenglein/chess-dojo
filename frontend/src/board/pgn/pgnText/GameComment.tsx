import { Event, EventType } from '@jackstenglein/chess';
import { Divider, Paper, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { commentTarget, InlineCommentInput, useInlineComment } from '../InlineCommentEditor';

import { useChess } from '../PgnBoard';
import Markdown from './Markdown';

const GameComment = () => {
    const { chess } = useChess();
    const { editing } = useInlineComment();
    const target = chess && editing ? commentTarget(chess, editing) : null;
    const [, setForceRender] = useState(0);

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [EventType.UpdateComment, EventType.DeleteBeforeMove],
                handler: (event: Event) => {
                    if (event.type === EventType.DeleteBeforeMove || !event.move) {
                        setForceRender((v) => v + 1);
                    }
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender]);

    if (target && !target.move)
        return <InlineCommentInput key={`${editing?.move?.ply}-${editing?.type}`} />;

    if (!chess?.pgn.gameComment.comment || chess.pgn.gameComment.comment.trim() === '[#]') {
        return null;
    }

    return (
        <Paper elevation={3} sx={{ boxShadow: 'none', color: 'text.secondary', borderRadius: 0 }}>
            <Stack>
                <Markdown text={chess.pgn.gameComment.comment.trim()} />
                <Divider sx={{ width: 1 }} />
            </Stack>
        </Paper>
    );
};

export default GameComment;
