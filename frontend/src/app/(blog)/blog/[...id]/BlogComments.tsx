'use client';

import { createBlogComment, deleteBlogComment, updateBlogComment } from '@/api/blogApi';
import { useAuth } from '@/auth/Auth';
import CommentEditor from '@/components/comments/CommentEditor';
import CommentList from '@/components/comments/CommentList';
import { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import CloseIcon from '@mui/icons-material/Close';
import { Divider, IconButton, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';

interface BlogCommentsProps {
    comments: Comment[] | null;
    owner: string;
    id: string;
}

function getReplyTargetName(comments: Comment[] | null, commentId: string): string {
    const comment = (comments ?? []).find((c) => c.id === commentId);
    return comment?.ownerDisplayName ?? 'a comment';
}

export default function BlogComments({ comments: initialComments, owner, id }: BlogCommentsProps) {
    const [comments, setComments] = useState<Comment[] | null>(initialComments);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const { user } = useAuth();

    const handleEdit = useCallback(
        async (commentId: string, content: string) => {
            const resp = await updateBlogComment({ owner, id, commentId }, content);
            setComments(resp.data.comments ?? null);
        },
        [owner, id],
    );

    const handleDelete = useCallback(
        async (commentId: string) => {
            const resp = await deleteBlogComment({ owner, id }, commentId);
            setComments(resp.data.comments ?? null);
        },
        [owner, id],
    );

    const handleReply = useCallback((parentCommentId: string) => {
        setReplyingTo(parentCommentId);
    }, []);

    return (
        <>
            <Divider sx={{ my: 3 }} />
            <Typography variant='h5' gutterBottom>
                Comments
            </Typography>
            <CommentList
                comments={comments}
                onEdit={user ? handleEdit : undefined}
                onDelete={user ? handleDelete : undefined}
                threaded
                onReply={user ? handleReply : undefined}
            />
            {user ? (
                replyingTo ? (
                    <Stack spacing={1}>
                        <Stack direction='row' alignItems='center' spacing={1}>
                            <Typography variant='body2' color='text.secondary'>
                                Replying to {getReplyTargetName(comments, replyingTo)}
                            </Typography>
                            <IconButton size='small' onClick={() => setReplyingTo(null)}>
                                <CloseIcon fontSize='small' />
                            </IconButton>
                        </Stack>
                        <CommentEditor<Blog, { owner: string; id: string; parentId: string }>
                            createFunctionProps={{ owner, id, parentId: replyingTo }}
                            createFunction={createBlogComment}
                            onSuccess={(blog) => {
                                setComments(blog.comments ?? null);
                                setReplyingTo(null);
                            }}
                            label='Write a reply...'
                            tooltip='Post Reply'
                        />
                    </Stack>
                ) : (
                    <CommentEditor<Blog, { owner: string; id: string }>
                        createFunctionProps={{ owner, id }}
                        createFunction={createBlogComment}
                        onSuccess={(blog) => setComments(blog.comments ?? null)}
                    />
                )
            ) : (
                <Typography color='text.secondary'>Sign in to comment</Typography>
            )}
        </>
    );
}
