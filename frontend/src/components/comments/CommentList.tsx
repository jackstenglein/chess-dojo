import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import Avatar from '@/profile/Avatar';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useState } from 'react';

interface CommentListProps {
    comments: Comment[] | null;
    maxComments?: number;
    viewCommentsLink?: string;
    onEdit?: (commentId: string, content: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
}

const CommentList: React.FC<CommentListProps> = ({
    comments,
    maxComments,
    viewCommentsLink,
    onEdit,
    onDelete,
}) => {
    if (!comments) {
        return null;
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
                />
            ))}
        </Stack>
    );
};

interface CommentListItemProps {
    comment: Comment;
    onEdit?: (commentId: string, content: string) => Promise<void>;
    onDelete?: (commentId: string) => Promise<void>;
}

const CommentListItem: React.FC<CommentListItemProps> = ({ comment, onEdit, onDelete }) => {
    const { user } = useAuth();
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const editRequest = useRequest();
    const deleteRequest = useRequest();

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
                                                onClick={() => setDeleteDialogOpen(true)}
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
                            <Typography sx={{ whiteSpace: 'pre-line' }}>
                                {comment.content}
                            </Typography>
                        )}
                    </Stack>
                </Paper>
                <Typography variant='caption' color='text.secondary'>
                    {toDojoDateString(createdAt, timezone)} •{' '}
                    {toDojoTimeString(createdAt, timezone, timeFormat)}
                    {isEdited && ' • (edited)'}
                </Typography>
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

export default CommentList;
