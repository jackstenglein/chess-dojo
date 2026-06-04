import { useReconcile } from '@/board/Board';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { Game, PositionComment } from '@/database/game';
import { Chess, EventType, Move } from '@jackstenglein/chess';
import {
    Button,
    CardContent,
    Divider,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import Comment from './Comment';
import CommentEditor, { CommentEditorProps } from './CommentEditor';
import { SaveAllVariationsButton } from './SaveAllVariationsButton';
import { isSuggestedVariation } from './suggestVariation';

const CommentViewKey = 'COMMENT_VIEW';
const CommentSortByKey = 'COMMENT_SORT_BY';

enum View {
    FullGame = 'FULL_GAME',
    CurrentMove = 'CURRENT_MOVE',
}

export enum SortBy {
    Newest = 'NEWEST',
    Oldest = 'OLDEST',
}

interface PositionCommentSortContextType {
    sortBy: SortBy;
}

const PositionCommentSortContext = createContext<PositionCommentSortContextType>({
    sortBy: SortBy.Newest,
});

export function usePositionCommentSort() {
    return useContext(PositionCommentSortContext);
}

interface PositionCommentSection {
    move: Move | null;
    comments: PositionComment[];
}

type CommentsProps = CommentEditorProps & {
    isReadonly?: boolean;
};

const Comments: React.FC<CommentsProps> = ({ focusEditor, setFocusEditor, isReadonly }) => {
    const [view, setView] = useLocalStorage(CommentViewKey, View.FullGame);
    const [sortBy, setSortBy] = useLocalStorage(CommentSortByKey, SortBy.Newest);
    const { chess } = useChess();
    const [, setForceRender] = useState(0);
    const { game } = useGame();

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [
                    EventType.LegalMove,
                    EventType.NewVariation,
                    EventType.DeleteMove,
                    EventType.DeleteBeforeMove,
                    EventType.PromoteVariation,
                ],
                handler: () => {
                    setForceRender((v) => v + 1);
                },
            };
            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender]);

    if (!game || !chess) {
        return null;
    }

    const fenSections = getFenSections(game, chess, view, sortBy);

    return (
        <CardContent sx={{ height: 1, p: 0 }}>
            <Stack height={1}>
                <Stack flexGrow={1} sx={{ overflowY: 'auto', p: 2 }}>
                    <Stack spacing={2}>
                        <SaveAllVariationsButton />

                        <Stack direction='row' spacing={1}>
                            <TextField
                                label='Show Comments From'
                                select
                                value={view}
                                onChange={(e) => setView(e.target.value as View)}
                                fullWidth
                                size='small'
                            >
                                <MenuItem value={View.FullGame}>Entire Game</MenuItem>
                                <MenuItem value={View.CurrentMove}>Current Position Only</MenuItem>
                            </TextField>

                            <TextField
                                label='Sort By'
                                select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortBy)}
                                fullWidth
                                size='small'
                            >
                                <MenuItem value={SortBy.Newest}>Newest First</MenuItem>
                                <MenuItem value={SortBy.Oldest}>Oldest First</MenuItem>
                            </TextField>
                        </Stack>
                    </Stack>

                    <Stack spacing={4} mt={3} flexGrow={1}>
                        <PositionCommentSortContext.Provider value={{ sortBy }}>
                            {fenSections.map((s) => (
                                <CommentSection
                                    isReadonly={isReadonly}
                                    key={s.move?.fen || 'start'}
                                    section={s}
                                />
                            ))}
                        </PositionCommentSortContext.Provider>
                    </Stack>
                </Stack>

                {!isReadonly && (
                    <CommentEditor focusEditor={focusEditor} setFocusEditor={setFocusEditor} />
                )}
            </Stack>
        </CardContent>
    );
};

export default Comments;

function getFenSections(game: Game, chess: Chess, view: View, sort: SortBy) {
    if (!game.positionComments || Object.values(game.positionComments).length === 0) {
        return [];
    }

    const fenSections: PositionCommentSection[] = [];

    if (view === View.CurrentMove) {
        const comments = getCommentsForFen(game, chess.normalizedFen(), chess.currentMove(), sort);
        if (isSuggestedVariation(chess.currentMove())) {
            let root = chess.currentMove();
            while (isSuggestedVariation(root?.previous)) {
                root = root?.previous ?? null;
            }
            const commentId = root?.commentDiag?.dojoComment?.substring(
                root.commentDiag?.dojoComment?.lastIndexOf(',') + 1,
            );
            const comment =
                game.positionComments[chess.normalizedFen(root?.previous)]?.[commentId || ''];
            if (comment) {
                fenSections.push({ move: root?.previous || null, comments: [comment] });
            }
        }
        fenSections.push({ move: chess.currentMove(), comments });
        return fenSections;
    }

    const startingComments = getCommentsForFen(game, chess.setUpFen(), null, sort);
    if (startingComments.length > 0) {
        fenSections.push({ move: null, comments: startingComments });
    }

    const stack = [chess.history()[0]];
    let move: Move | undefined;
    while ((move = stack.pop()) !== undefined) {
        const fen = chess.normalizedFen(move);
        const selectedComments = getCommentsForFen(game, fen, move, sort);
        if (selectedComments.length > 0) {
            fenSections.push({ move, comments: selectedComments });
        }

        if (move.next) {
            stack.push(move.next);
        }
        for (let i = move.variations.length - 1; i >= 0; i--) {
            stack.push(move.variations[i][0]);
        }
    }

    return fenSections;
}

function getCommentsForFen(
    game: Game,
    fen: string,
    move: Move | null,
    sort: SortBy,
): PositionComment[] {
    const fenComments = game.positionComments[fen] || {};
    const selectedComments: PositionComment[] = [];

    for (const comment of Object.values(fenComments)) {
        if (comment.ply === (move?.ply || 0) && comment.san === move?.san) {
            selectedComments.push(comment);
        }
    }

    selectedComments.sort((lhs, rhs) => {
        if (sort === SortBy.Newest) {
            return rhs.createdAt.localeCompare(lhs.createdAt);
        }
        return lhs.createdAt.localeCompare(rhs.createdAt);
    });

    return selectedComments;
}

interface CommentSectionProps {
    section: PositionCommentSection;
    isReadonly?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ isReadonly, section }) => {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const move = section.move;

    const onClick = () => {
        chess?.seek(section.move);
        reconcile();
    };

    return (
        <Stack width={1} spacing={2}>
            <Stack width={1} alignItems='start'>
                <Button sx={{ textTransform: 'none', pb: 0 }} onClick={onClick}>
                    {move
                        ? `${move.ply % 2 ? `${Math.floor(move.ply / 2) + 1}.` : `${move.ply / 2}...`} ${move.san}`
                        : 'Starting Position'}
                </Button>
                <Divider sx={{ width: 1 }} />
            </Stack>
            {section.comments.map((c) => (
                <Comment isReadonly={isReadonly} key={c.id} comment={c} move={move} />
            ))}
            {section.comments.length === 0 && <Typography>No comments</Typography>}
        </Stack>
    );
};
