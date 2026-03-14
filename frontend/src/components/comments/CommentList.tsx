import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import Avatar from '@/profile/Avatar';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ReplyIcon from '@mui/icons-material/Reply';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Popover,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { groupCommentsIntoThreads } from './threadComments';

const COMMENT_LINE_CLAMP = 4;
const COLLAPSE_REPLY_THRESHOLD = 3;

interface CommentListProps {
    comments: Comment[] | null;
    maxComments?: number;
    viewCommentsLink?: string;
    onEdit?: (commentId: string, content: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
    threaded?: boolean;
    onSubmitReply?: (parentId: string, content: string) => Promise<void>;
    onReact?: (commentId: string, reactionType: string) => Promise<void>;
}

const CommentList: React.FC<CommentListProps> = ({
    comments,
    maxComments,
    viewCommentsLink,
    onEdit,
    onDelete,
    threaded,
    onSubmitReply,
    onReact,
}) => {
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const replyRequest = useRequest();

    const toggleThread = (threadId: string) => {
        setExpandedThreads((prev) => {
            const next = new Set(prev);
            if (next.has(threadId)) {
                next.delete(threadId);
            } else {
                next.add(threadId);
            }
            return next;
        });
    };

    const handleReplyClick = (parentCommentId: string) => {
        setReplyingTo(parentCommentId);
    };

    const handleSubmitReply = (parentId: string, content: string) => {
        if (!onSubmitReply) {
            return;
        }
        replyRequest.onStart();
        onSubmitReply(parentId, content)
            .then(() => {
                replyRequest.onSuccess();
                setReplyingTo(null);
                setExpandedThreads((prev) => new Set(prev).add(parentId));
            })
            .catch((err: unknown) => {
                replyRequest.onFailure(err);
            });
    };

    if (!comments) {
        return null;
    }

    if (threaded) {
        const threads = groupCommentsIntoThreads(comments);
        const displayThreads = maxComments
            ? threads.slice(Math.max(0, threads.length - maxComments))
            : threads;
        const hiddenThreads = threads.length - displayThreads.length;

        return (
            <Stack spacing={2} width={1} alignItems='start' mb={2}>
                <RequestSnackbar request={replyRequest} />

                {hiddenThreads > 0 && viewCommentsLink && (
                    <Link href={viewCommentsLink} sx={{ pl: '52px' }}>
                        View {hiddenThreads} earlier comment
                        {hiddenThreads !== 1 ? 's' : ''}
                    </Link>
                )}

                {displayThreads.map((thread) => {
                    const isCollapsible = thread.replies.length >= COLLAPSE_REPLY_THRESHOLD;
                    const isExpanded = expandedThreads.has(thread.root.id);
                    const hiddenReplies =
                        isCollapsible && !isExpanded ? thread.replies.slice(0, -2) : [];
                    const visibleReplies =
                        isCollapsible && !isExpanded ? thread.replies.slice(-2) : thread.replies;

                    return (
                        <Stack key={thread.root.id} spacing={1} width={1}>
                            <CommentListItem
                                comment={thread.root}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReply={onSubmitReply ? handleReplyClick : undefined}
                                onReact={onReact}
                            />
                            {replyingTo === thread.root.id && onSubmitReply && (
                                <InlineReplyEditor
                                    parentId={thread.root.id}
                                    parentName={thread.root.ownerDisplayName}
                                    onSubmit={handleSubmitReply}
                                    onCancel={() => setReplyingTo(null)}
                                    isLoading={replyRequest.isLoading()}
                                />
                            )}
                            {hiddenReplies.length > 0 && (
                                <Button
                                    size='small'
                                    onClick={() => toggleThread(thread.root.id)}
                                    sx={{
                                        textTransform: 'none',
                                        pl: '52px',
                                        justifyContent: 'flex-start',
                                    }}
                                >
                                    Show {hiddenReplies.length} more{' '}
                                    {hiddenReplies.length === 1 ? 'reply' : 'replies'}
                                </Button>
                            )}
                            {isCollapsible && isExpanded && (
                                <Button
                                    size='small'
                                    onClick={() => toggleThread(thread.root.id)}
                                    sx={{
                                        textTransform: 'none',
                                        pl: '52px',
                                        justifyContent: 'flex-start',
                                    }}
                                >
                                    Hide replies
                                </Button>
                            )}
                            {visibleReplies.map((reply) => (
                                <Stack key={reply.id} spacing={1} pl='52px' width={1}>
                                    <CommentListItem
                                        comment={reply}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onReply={onSubmitReply ? handleReplyClick : undefined}
                                        onReact={onReact}
                                    />
                                    {replyingTo === reply.id && onSubmitReply && (
                                        <InlineReplyEditor
                                            parentId={thread.root.id}
                                            parentName={reply.ownerDisplayName}
                                            onSubmit={handleSubmitReply}
                                            onCancel={() => setReplyingTo(null)}
                                            isLoading={replyRequest.isLoading()}
                                        />
                                    )}
                                </Stack>
                            ))}
                        </Stack>
                    );
                })}
            </Stack>
        );
    }

    const displayComments = maxComments
        ? comments.slice(Math.max(0, comments.length - maxComments))
        : comments;

    const hiddenComments = comments.length - displayComments.length;

    return (
        <Stack spacing={2} width={1} alignItems='start' mb={2}>
            {hiddenComments > 0 && viewCommentsLink && (
                <Link href={viewCommentsLink} sx={{ pl: '52px' }}>
                    View {hiddenComments} earlier comment{hiddenComments !== 1 ? 's' : ''}
                </Link>
            )}

            {displayComments.map((comment) => (
                <CommentListItem
                    key={comment.id}
                    comment={comment}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReact={onReact}
                />
            ))}
        </Stack>
    );
};

interface CommentListItemProps {
    comment: Comment;
    onEdit?: (commentId: string, content: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
    onReply?: (parentCommentId: string) => void;
    onReact?: (commentId: string, reactionType: string) => Promise<void>;
}

const CommentListItem: React.FC<CommentListItemProps> = ({
    comment,
    onEdit,
    onDelete,
    onReply,
    onReact,
}) => {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [expanded, setExpanded] = useState(false);
    const [isClamped, setIsClamped] = useState(false);
    const contentRef = useRef<HTMLElement>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const editRequest = useRequest();
    const deleteRequest = useRequest();
    const [reactionAnchorEl, setReactionAnchorEl] = useState<HTMLElement | null>(null);
    const reactionOpen = Boolean(reactionAnchorEl);

    const [localReactions, setLocalReactions] = useState(comment.reactions || {});
    const REACTION_OPTIONS = ['👍', '❤️', '😂', '🔥', '🎉'];

    const handleReactionClick = (event: React.MouseEvent<HTMLElement>) => {
        setReactionAnchorEl(event.currentTarget);
    };

    const handleReactionClose = () => {
        setReactionAnchorEl(null);
    };

    const handleSelectReaction = (emoji: string) => {
        if (!user) return;

        setLocalReactions((prev) => {
            const existingReaction = prev[user.username];
            const currentTypes = existingReaction?.types || [];
            const newTypes = currentTypes.includes(emoji) ? [] : [emoji];

            return {
                ...prev,
                [user.username]: {
                    username: user.username,
                    displayName: user.displayName,
                    cohort: user.dojoCohort,
                    updatedAt: new Date().toISOString(),
                    types: newTypes,
                },
            };
        });
        if (onReact) {
            onReact(comment.id, emoji).catch(() => {
                // ignore errors for now since backend is pending
            });
        }
        handleReactionClose();
    };
    useEffect(() => {
        const el = contentRef.current;
        if (el) {
            setIsClamped(el.scrollHeight > el.clientHeight);
        }
    }, [comment.content]);

    useEffect(() => {
        setExpanded(false);
    }, [comment.content]);

    const createdAt = new Date(comment.createdAt);
    const isEdited = comment.updatedAt !== comment.createdAt;

    const timezone = user?.timezoneOverride;
    const timeFormat = user?.timeFormat;

    const canModify = (onEdit || onDelete) && (user?.username === comment.owner || user?.isAdmin);

    const handleSaveEdit = () => {
        const content = editContent.trim();
        if (content.length === 0 || !onEdit) {
            return;
        }
        editRequest.onStart();
        onEdit(comment.id, content)
            .then(() => {
                editRequest.onSuccess();
                setEditing(false);
            })
            .catch((err: unknown) => {
                editRequest.onFailure(err);
            });
    };

    const handleDelete = () => {
        if (!onDelete) {
            return;
        }
        deleteRequest.onStart();
        onDelete(comment.id)
            .then(() => {
                deleteRequest.onSuccess();
                setDeleteDialogOpen(false);
            })
            .catch((err: unknown) => {
                deleteRequest.onFailure(err);
            });
    };

    return (
        <Stack direction='row' spacing={1.5} width={1}>
            <RequestSnackbar request={editRequest} />
            <RequestSnackbar request={deleteRequest} />

            <Avatar username={comment.owner} displayName={comment.ownerDisplayName} size={40} />

            <Stack flexGrow={1} minWidth={0}>
                <Paper elevation={2} sx={{ px: '12px', py: '8px', borderRadius: '6px' }}>
                    <Stack>
                        <Stack direction='row' justifyContent='space-between' alignItems='center'>
                            <Link href={`/profile/${comment.owner}`}>
                                <Typography variant='subtitle1' color='text.secondary'>
                                    {comment.ownerDisplayName} ({comment.ownerCohort})
                                </Typography>
                            </Link>

                            {canModify && !editing && (
                                <Stack direction='row' spacing={0.5}>
                                    {onEdit && (
                                        <Tooltip title='Edit'>
                                            <IconButton
                                                size='small'
                                                onClick={() => {
                                                    setEditContent(comment.content);
                                                    setEditing(true);
                                                }}
                                            >
                                                <EditIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {onDelete && (
                                        <Tooltip title='Delete'>
                                            <IconButton
                                                size='small'
                                                onClick={() => {
                                                    deleteRequest.reset();
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <DeleteIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            )}
                        </Stack>

                        {editing ? (
                            <Stack spacing={1}>
                                <TextField
                                    fullWidth
                                    multiline
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    slotProps={{ htmlInput: { maxLength: 10000 } }}
                                />
                                <Stack direction='row' spacing={1} justifyContent='flex-end'>
                                    <Tooltip title='Cancel'>
                                        <IconButton
                                            size='small'
                                            onClick={() => setEditing(false)}
                                            disabled={editRequest.isLoading()}
                                        >
                                            <CloseIcon fontSize='small' />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title='Save'>
                                        <IconButton
                                            size='small'
                                            color='primary'
                                            onClick={handleSaveEdit}
                                            disabled={
                                                editContent.trim().length === 0 ||
                                                editRequest.isLoading()
                                            }
                                        >
                                            <SaveIcon fontSize='small' />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        ) : (
                            <>
                                <Typography
                                    ref={contentRef}
                                    sx={{
                                        whiteSpace: 'pre-line',
                                        ...(!expanded && {
                                            display: '-webkit-box',
                                            WebkitLineClamp: COMMENT_LINE_CLAMP,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }),
                                    }}
                                >
                                    {comment.content}
                                </Typography>
                                {isClamped && (
                                    <Button
                                        size='small'
                                        onClick={() => setExpanded(!expanded)}
                                        sx={{
                                            textTransform: 'none',
                                            p: 0,
                                            minWidth: 0,
                                            alignSelf: 'flex-start',
                                        }}
                                    >
                                        {expanded ? 'Show less' : 'Show more'}
                                    </Button>
                                )}
                            </>
                        )}

                        {onReply && user && !editing && (
                            <Tooltip title='Reply'>
                                <IconButton
                                    size='small'
                                    onClick={() => onReply(comment.id)}
                                    sx={{ alignSelf: 'flex-end' }}
                                >
                                    <ReplyIcon fontSize='small' />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Paper>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography variant='caption' color='text.secondary'>
                        {toDojoDateString(createdAt, timezone)} •{' '}
                        {toDojoTimeString(createdAt, timezone, timeFormat)}
                        {isEdited && ' • (edited)'}
                    </Typography>
                    {user && (
                        <Tooltip title='Add Reaction'>
                            <IconButton size='small' onClick={handleReactionClick}>
                                <AddReactionOutlinedIcon
                                    fontSize='small'
                                    sx={{ color: 'text.secondary' }}
                                />
                            </IconButton>
                        </Tooltip>
                    )}
                    {Object.values(localReactions).some((r) => r.types && r.types.length > 0) && (
                        <Stack direction='row' spacing={0.5} mt={1} flexWrap='wrap'>
                            {REACTION_OPTIONS.map((emoji) => {
                                const reactingUsers = Object.values(localReactions).filter((r) =>
                                    r.types?.includes(emoji),
                                );
                                const count = reactingUsers.length;

                                if (count === 0) return null;

                                const isSelectedByMe =
                                    localReactions[user?.username || '']?.types?.includes(emoji);
                                const MAX_NAMES = 3;
                                let tooltipText = '';

                                if (count <= MAX_NAMES) {
                                    tooltipText = reactingUsers
                                        .map((r) => r.displayName)
                                        .join(', ');
                                } else {
                                    const firstFew = reactingUsers
                                        .slice(0, MAX_NAMES)
                                        .map((r) => r.displayName)
                                        .join(', ');
                                    tooltipText = `${firstFew} and ${count - MAX_NAMES} others`;
                                }
                                return (
                                    <Tooltip key={emoji} title={tooltipText} placement='bottom'>
                                        <Button
                                            size='small'
                                            variant='outlined'
                                            onClick={() => handleSelectReaction(emoji)}
                                            sx={{
                                                borderRadius: 4,
                                                py: 0.25,
                                                px: 1,
                                                minWidth: 0,
                                                textTransform: 'none',
                                                borderColor: isSelectedByMe
                                                    ? 'primary.main'
                                                    : 'divider',
                                                backgroundColor: isSelectedByMe
                                                    ? 'action.selected'
                                                    : 'transparent',
                                                color: isSelectedByMe
                                                    ? 'primary.main'
                                                    : 'text.secondary',
                                            }}
                                        >
                                            {emoji}{' '}
                                            <Typography variant='caption' sx={{ ml: 0.5 }}>
                                                {count}
                                            </Typography>
                                        </Button>
                                    </Tooltip>
                                );
                            })}
                        </Stack>
                    )}
                </Stack>
                <Popover
                    open={reactionOpen}
                    anchorEl={reactionAnchorEl}
                    onClose={handleReactionClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Stack direction='row' spacing={0.5} p={0.5}>
                        {REACTION_OPTIONS.map((emoji) => (
                            <IconButton
                                key={emoji}
                                size='small'
                                onClick={() => handleSelectReaction(emoji)}
                            >
                                {emoji}
                            </IconButton>
                        ))}
                    </Stack>
                </Popover>
            </Stack>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Comment</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this comment? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        color='error'
                        onClick={handleDelete}
                        disabled={deleteRequest.isLoading()}
                    >
                        Delete
                    </Button>
                </DialogActions>
                <RequestSnackbar request={deleteRequest} />
            </Dialog>
        </Stack>
    );
};

interface InlineReplyEditorProps {
    parentId: string;
    parentName: string;
    onSubmit: (parentId: string, content: string) => void;
    onCancel: () => void;
    isLoading: boolean;
}

const InlineReplyEditor: React.FC<InlineReplyEditorProps> = ({
    parentId,
    parentName,
    onSubmit,
    onCancel,
    isLoading,
}) => {
    const [content, setContent] = useState('');

    return (
        <Stack pl='52px' spacing={0.5} width={1}>
            <Stack direction='row' alignItems='center' spacing={1}>
                <Typography variant='body2' color='text.secondary'>
                    Replying to {parentName}
                </Typography>
                <IconButton size='small' onClick={onCancel} disabled={isLoading}>
                    <CloseIcon fontSize='small' />
                </IconButton>
            </Stack>
            <Stack direction='row' spacing={1} alignItems='start'>
                <TextField
                    fullWidth
                    multiline
                    size='small'
                    label='Write a reply...'
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 10000 } }}
                />
                <Tooltip title='Post Reply'>
                    <span>
                        <IconButton
                            color='primary'
                            onClick={() => onSubmit(parentId, content.trim())}
                            disabled={content.trim().length === 0 || isLoading}
                        >
                            <SendIcon fontSize='small' />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
        </Stack>
    );
};

export default CommentList;
