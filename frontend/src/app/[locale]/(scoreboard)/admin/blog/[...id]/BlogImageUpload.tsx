'use client';

import { uploadBlogImage } from '@/api/blogApi';
import { Alert, Button, Stack } from '@mui/material';
import { useState } from 'react';

export function BlogImageUpload({
    onUpload,
    label = 'Upload cover image',
}: {
    onUpload: (url: string) => void;
    label?: string;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    return (
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Button component='label' variant='outlined' loading={loading}>
                {label}
                <input
                    type='file'
                    hidden
                    accept='image/jpeg,image/png,image/webp,image/gif'
                    disabled={loading}
                    onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        setError('');
                        if (
                            !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
                                file.type,
                            ) ||
                            file.size > 3 * 1024 * 1024
                        ) {
                            setError('Choose a JPEG, PNG, WebP, or GIF image up to 3 MB.');
                            return;
                        }
                        setLoading(true);
                        try {
                            onUpload(await uploadBlogImage(file));
                        } catch {
                            setError('Image upload failed. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            </Button>
            {error && <Alert severity='error'>{error}</Alert>}
        </Stack>
    );
}
