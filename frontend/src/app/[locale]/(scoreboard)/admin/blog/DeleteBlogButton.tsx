'use client';

import { deleteBlog } from '@/api/blogApi';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useState } from 'react';

/** Confirmation and error handling shared by the admin list and editor. */
export function DeleteBlogButton({
    owner,
    id,
    title,
    onDeleted,
}: {
    owner: string;
    id: string;
    title: string;
    onDeleted: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const close = () => {
        if (!loading) setOpen(false);
    };
    return (
        <>
            <Button
                color='error'
                onClick={() => {
                    setError('');
                    setOpen(true);
                }}
            >
                Delete post
            </Button>
            <Dialog open={open} onClose={close} aria-labelledby='delete-blog-title'>
                <DialogTitle id='delete-blog-title'>Delete blog post?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Permanently delete “{title}” and all its comments? This cannot be undone.
                    </DialogContentText>
                    {error && (
                        <Alert severity='error' sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        color='error'
                        variant='contained'
                        loading={loading}
                        onClick={async () => {
                            if (loading) return;
                            setLoading(true);
                            setError('');
                            try {
                                await deleteBlog({ owner, id });
                                setOpen(false);
                                onDeleted();
                            } catch {
                                setError('Could not delete the blog post. Please try again.');
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        Delete permanently
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
