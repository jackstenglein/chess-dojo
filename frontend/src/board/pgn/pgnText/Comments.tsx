import { PositionComment } from '@/database/game';
import { CommentType, Event, EventType, Move } from '@jackstenglein/chess';
import { Divider } from '@mui/material';
import { useEffect, useState } from 'react';
import { commentTarget, InlineCommentInput, useInlineComment } from '../InlineCommentEditor';
import { useChess } from '../PgnBoard';
import InlinePositionComments from './InlinePositionComments';
import Markdown from './Markdown';

interface CommentsProps {
    move: Move;
    type?: CommentType;
    inline?: boolean;
    inlineComments: PositionComment[];
}

export function Comments({ move, type, inline, inlineComments }: CommentsProps) {
    const { chess } = useChess();
    const { editing } = useInlineComment();
    const target = chess && editing ? commentTarget(chess, editing) : null;
    const isEditing = target?.move === move && target?.type === (type ?? CommentType.After);
    const [, setForceRender] = useState(0);

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [EventType.UpdateComment],
                handler: (event: Event) => {
                    if (event.move === move) {
                        setForceRender((v) => v + 1);
                    }
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, move, setForceRender]);

    const text = type === CommentType.Before ? move.commentMove : move.commentAfter;

    if (isEditing) return <InlineCommentInput key={`${editing?.move?.ply}-${editing?.type}`} />;

    if (!text && inlineComments.length === 0) {
        return null;
    }

    return (
        <>
            {text && <Markdown text={text} inline={inline} move={move} />}
            {text && inlineComments.length > 0 && !inline && <Divider />}
            <InlinePositionComments comments={inlineComments} inline={inline} />
        </>
    );
}
