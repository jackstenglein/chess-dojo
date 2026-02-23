'use client';

import { createBlogComment } from '@/api/blogApi';
import { useAuth } from '@/auth/Auth';
import CommentEditor from '@/components/comments/CommentEditor';
import CommentList from '@/components/comments/CommentList';
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

    return (
        <>
            <Divider sx={{ my: 3 }} />
            <Typography variant='h5' gutterBottom>
                Comments
            </Typography>
            <CommentList comments={comments} />
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
