import { useApi } from '@/api/Api';
import { UpdateCommentRequest } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { BlockBoardKeyboardShortcuts, useChess } from '@/board/pgn/PgnBoard';
import Lines from '@/board/pgn/pgnText/Lines';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import useGame from '@/context/useGame';
import { PositionComment } from '@/database/game';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Move } from '@jackstenglein/chess';
import { Edit, ExpandMore } from '@mui/icons-material';
import {
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { useState, type JSX } from 'react';
import Replies from './Replies';
import ReplyEditor from './ReplyEditor';
import { isVariationInComment, isVariationSuggestor } from './suggestVariation';

interface CommentProps {
    comment: PositionComment;
    isReadonly?: boolean;
    /** The move the comment applies to. */
    move?: Move | null;
}

const Comment: React.FC<CommentProps> = ({ isReadonly, comment, move }) => {
    const viewer = useAuth().user;

    if (viewer?.username === comment.owner.username) {
        return <EditableComment comment={comment} move={move} />;
    }

    return (
        <BaseComment
            isReadonly={isReadonly}
            hideControls={isReadonly}
            comment={comment}
            move={move}
        />
    );
};

export default Comment;

interface BaseCommentProps {
    comment: PositionComment;
    /** The move the comment applies to. */
    move?: Move | null;
    renderContent?: JSX.Element;
    renderControls?: JSX.Element;
    hideControls?: boolean;
    isReadonly?: boolean;
}

const BaseComment: React.FC<BaseCommentProps> = ({
    comment,
    move,
    renderContent,
    renderControls,
    hideControls,
    isReadonly,
}) => {
    const t = useTranslations('analysisBoard.underboard.comments');
    const { chess } = useChess();
    const [expanded, setExpanded] = useState(true);
    const [isReplying, setIsReplying] = useState(false);

    let suggestedVariation: Move[] | undefined = undefined;
    if (comment.suggestedVariation) {
        const nextMove = chess?.nextMove(move);
        if (
            isVariationSuggestor(comment.owner.username, nextMove) &&
            isVariationInComment(comment.id, nextMove)
        ) {
            suggestedVariation = nextMove?.variation.slice(nextMove.variation.indexOf(nextMove));
        } else {
            suggestedVariation = chess
                ?.nextMove(move)
                ?.variations.find(
                    (v) =>
                        isVariationSuggestor(comment.owner.username, v[0]) &&
                        isVariationInComment(comment.id, v[0]),
                );
        }
    }

    return (
        <Stack spacing={0.5}>
            <Stack direction='row' spacing={0.5}>
                {!expanded && (
                    <Tooltip title={t('expandComment')}>
                        <IconButton onClick={() => setExpanded(true)} size='small'>
                            <ExpandMore fontSize='small' sx={{ color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                )}
                <CommentInfo comment={comment} />
            </Stack>
            <Collapse in={expanded}>
                <Stack direction='row'>
                    <Tooltip title={t('collapseComment')}>
                        <Stack
                            alignItems='center'
                            sx={{
                                width: '20px',
                                minWidth: '20px',
                                maxWidth: '20px',
                                cursor: 'pointer',

                                ':hover .MuiDivider-root': {
                                    borderColor: 'primary.main',
                                },
                            }}
                            onClick={() => setExpanded(false)}
                        >
                            <Divider orientation='vertical' />
                        </Stack>
                    </Tooltip>
                    <Stack flexGrow={1} spacing={0.5}>
                        {renderContent ? (
                            renderContent
                        ) : comment.suggestedVariation ? (
                            <>
                                <Typography variant='body2' color='text.secondary'>
                                    {t('suggestedVariation')}
                                </Typography>
                                {suggestedVariation && (
                                    <Lines
                                        lines={[suggestedVariation]}
                                        handleScroll={() => null}
                                        forceShowSuggestedVariations
                                        showInlinePositionComments={false}
                                        slotProps={{
                                            moveButton: { hideSuggestedVariationOwner: true },
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <Typography variant='body1' style={{ whiteSpace: 'pre-line' }}>
                                {comment.content}
                            </Typography>
                        )}

                        {isReplying ? (
                            <ReplyEditor parent={comment} onCancel={() => setIsReplying(false)} />
                        ) : (
                            !isReadonly &&
                            !hideControls && (
                                <Stack direction='row' spacing={1}>
                                    <Button
                                        size='small'
                                        sx={{ textTransform: 'none', minWidth: 0 }}
                                        onClick={() => setIsReplying(true)}
                                    >
                                        {t('reply')}
                                    </Button>
                                    {renderControls}
                                </Stack>
                            )
                        )}

                        <Replies isReadonly={isReadonly} comment={comment} />
                    </Stack>
                </Stack>
            </Collapse>
        </Stack>
    );
};

const EditableComment: React.FC<CommentProps> = ({ comment, move }) => {
    const t = useTranslations('analysisBoard.underboard.comments');
    const [editValue, setEditValue] = useState<string>();
    const [showDelete, setShowDelete] = useState(false);
    const api = useApi();
    const request = useRequest();
    const deleteRequest = useRequest();
    const { game, onUpdateGame } = useGame();

    const onSave = () => {
        if (editValue === comment.content) {
            setEditValue(undefined);
            return;
        }

        const update: UpdateCommentRequest = {
            cohort: game?.cohort || '',
            gameId: game?.id || '',
            id: comment.id,
            fen: comment.fen,
            content: editValue?.trim() || '',
            suggestedVariation: '',
            parentIds: comment.parentIds || '',
        };
        request.onStart();
        api.updateComment(update)
            .then((resp) => {
                onUpdateGame?.(resp.data);
                setEditValue(undefined);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const onDelete = () => {
        deleteRequest.onStart();
        api.deleteComment({
            cohort: game?.cohort || '',
            gameId: game?.id || '',
            id: comment.id,
            fen: comment.fen,
            parentIds: comment.parentIds || '',
        })
            .then((resp) => {
                onUpdateGame?.(resp.data);
                setShowDelete(false);
            })
            .catch((err) => {
                deleteRequest.onFailure(err);
            });
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || !e.shiftKey) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        onSave();
    };

    return (
        <>
            <BaseComment
                comment={comment}
                move={move}
                renderContent={
                    editValue === undefined ? undefined : (
                        <Stack width={1}>
                            <TextField
                                id={BlockBoardKeyboardShortcuts}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={onKeyDown}
                                size='small'
                                sx={{ pt: 0.5 }}
                                multiline
                                disabled={request.isLoading() || deleteRequest.isLoading()}
                            />
                            <Stack direction='row'>
                                <Button
                                    size='small'
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => setEditValue(undefined)}
                                    disabled={request.isLoading()}
                                >
                                    cancel
                                </Button>
                                <Button
                                    disabled={editValue.trim().length === 0}
                                    loading={request.isLoading()}
                                    size='small'
                                    sx={{ textTransform: 'none' }}
                                    onClick={onSave}
                                >
                                    save
                                </Button>
                            </Stack>
                        </Stack>
                    )
                }
                renderControls={
                    editValue === undefined ? (
                        <>
                            {comment.content && (
                                <Button
                                    size='small'
                                    sx={{ textTransform: 'none', minWidth: 0 }}
                                    onClick={() => setEditValue(comment.content)}
                                >
                                    {t('edit')}
                                </Button>
                            )}
                            <Button
                                size='small'
                                sx={{ textTransform: 'none', minWidth: 0 }}
                                onClick={() => setShowDelete(true)}
                            >
                                delete
                            </Button>
                        </>
                    ) : undefined
                }
                hideControls={editValue !== undefined}
            />

            <Dialog
                open={showDelete}
                onClose={deleteRequest.isLoading() ? undefined : () => setShowDelete(false)}
            >
                <DialogTitle>{t('deleteCommentTitle')}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t('deleteCommentWarning')}</DialogContentText>
                    <DialogActions>
                        <Button
                            disabled={deleteRequest.isLoading()}
                            onClick={() => setShowDelete(false)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            loading={deleteRequest.isLoading()}
                            color='error'
                            onClick={onDelete}
                        >
                            {t('delete')}
                        </Button>
                    </DialogActions>
                </DialogContent>
            </Dialog>

            <RequestSnackbar request={request} />
        </>
    );
};

const CommentInfo: React.FC<Omit<CommentProps, 'move'>> = ({ comment }) => {
    const t = useTranslations('analysisBoard.underboard.comments');
    const viewer = useAuth().user;

    const createdAt = new Date(comment.createdAt);

    const createdAtDate = toDojoDateString(createdAt, viewer?.timezoneOverride);
    const createdAtTime = toDojoTimeString(createdAt, viewer?.timezoneOverride, viewer?.timeFormat);

    let updatedAtDate = '';
    let updatedAtTime = '';

    if (comment.createdAt !== comment.updatedAt) {
        const updatedAt = new Date(comment.updatedAt);
        updatedAtDate = toDojoDateString(updatedAt, viewer?.timezoneOverride);
        updatedAtTime = toDojoTimeString(updatedAt, viewer?.timezoneOverride, viewer?.timeFormat);
    }

    return (
        <Stack direction='row' spacing={1.5} alignItems='center'>
            <Avatar
                username={comment.owner.username}
                displayName={comment.owner.displayName}
                size={20}
            />
            <Stack direction='row' spacing={1} alignItems='center'>
                <Link href={`/profile/${comment.owner.username}`} sx={{ textDecoration: 'none' }}>
                    <Typography variant='subtitle1' sx={{ color: 'text.primary' }}>
                        {comment.owner.displayName} ({comment.owner.cohort})
                    </Typography>
                </Link>
                <CohortIcon cohort={comment.owner.previousCohort} size={20} />
                <Typography variant='caption' color='text.secondary'>
                    • {createdAtDate} {createdAtTime}
                </Typography>
                {updatedAtDate && (
                    <Tooltip title={t('updatedAt', { date: updatedAtDate, time: updatedAtTime })}>
                        <Edit sx={{ color: 'text.secondary', fontSize: '0.8rem' }} />
                    </Tooltip>
                )}
            </Stack>
        </Stack>
    );
};
