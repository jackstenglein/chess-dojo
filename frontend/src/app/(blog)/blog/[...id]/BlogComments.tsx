'use client';

import { createBlogComment, deleteBlogComment, updateBlogComment } from '@/api/blogApi';
import { useAuth } from '@/auth/Auth';
import CommentEditor from '@/components/comments/CommentEditor';
import CommentList from '@/components/comments/CommentList';
import { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { Divider, Typography } from '@mui/material';
import { useCallback, useState } from 'react';

interface BlogCommentsProps {
    comments: Comment[] | null;
    owner: string;
    id: string;
}

export default function BlogComments({ comments: initialComments, owner, id }: BlogCommentsProps) {
    const [comments, setComments] = useState<Comment[] | null>(initialComments);
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
            />
            {user ? (
                <CommentEditor<Blog, { owner: string; id: string }>
                    createFunctionProps={{ owner, id }}
                    createFunction={createBlogComment}
                    onSuccess={(blog) => setComments(blog.comments ?? null)}
                />
            ) : (
                <Typography color='text.secondary'>Sign in to comment</Typography>
            )}
        </>
    );
}
