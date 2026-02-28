'use client';

import { createBlogComment, deleteBlogComment, updateBlogComment } from '@/api/blogApi';
import { useAuth } from '@/auth/Auth';
import CommentEditor from '@/components/comments/CommentEditor';
import CommentList from '@/components/comments/CommentList';
import { Link } from '@/components/navigation/Link';
import { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { Divider, Typography } from '@mui/material';
import { useState } from 'react';

interface BlogCommentsProps {
    comments: Comment[] | null;
    owner: string;
    id: string;
}

export default function BlogComments({ comments: initialComments, owner, id }: BlogCommentsProps) {
    const [comments, setComments] = useState<Comment[] | null>(initialComments);
    const { user } = useAuth();

    const handleEdit = async (commentId: string, content: string) => {
        const resp = await updateBlogComment({ owner, id, commentId }, content);
        setComments(resp.data.comments ?? null);
    };

    const handleDelete = async (commentId: string) => {
        const resp = await deleteBlogComment({ owner, id }, commentId);
        setComments(resp.data.comments ?? null);
    };

    const handleSubmitReply = async (parentId: string, content: string) => {
        const resp = await createBlogComment({ owner, id, parentId }, content);
        setComments(resp.data.comments ?? null);
    };

    return (
        <>
            <Divider sx={{ my: 3 }} />
            <Typography variant='h5' gutterBottom>
                Comments{comments && comments.length >= 2 ? ` (${comments.length})` : ''}
            </Typography>
            <CommentList
                comments={comments}
                onEdit={user ? handleEdit : undefined}
                onDelete={user ? handleDelete : undefined}
                threaded
                onSubmitReply={user ? handleSubmitReply : undefined}
            />
            {user ? (
                <CommentEditor<Blog, { owner: string; id: string }>
                    createFunctionProps={{ owner, id }}
                    createFunction={createBlogComment}
                    onSuccess={(blog) => setComments(blog.comments ?? null)}
                />
            ) : (
                <Typography color='text.secondary'>
                    <Link href='/signin'>Sign in</Link> to comment
                </Typography>
            )}
        </>
    );
}
