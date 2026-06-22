'use client';

import { ListBlogsResponse, listBlogs } from '@/api/blogApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import type { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { DOJO_BLOG_OWNER } from '@jackstenglein/chess-dojo-common/src/blog/api';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Container,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;

export default function AdminBlogListPage() {
    const auth = useAuth();
    const router = useRouter();
    const request = useRequest<ListBlogsResponse>();

    const [blogs, setBlogs] = useState<Blog[]>([]);
    const [nextStartKey, setNextStartKey] = useState<string | undefined>(undefined);

    const fetchBlogs = useCallback(
        (startKey?: string) => {
            request.onStart();
            listBlogs({
                owner: DOJO_BLOG_OWNER,
                limit: PAGE_SIZE,
                startKey,
            })
                .then((res) => {
                    const data = res.data;
                    setBlogs((prev) => (startKey ? [...prev, ...data.blogs] : data.blogs));
                    setNextStartKey(data.lastEvaluatedKey);
                    request.onSuccess(data);
                })
                .catch((err) => request.onFailure(err));
        },
        [request],
    );

    useEffect(() => {
        if (auth.status !== AuthStatus.Loading && !auth.user?.isAdmin) {
            router.replace('/profile');
        }
    }, [auth.status, auth.user?.isAdmin, router]);

    useEffect(() => {
        if (auth.user?.isAdmin && !request.isSent()) {
            fetchBlogs();
        }
    }, [auth.user?.isAdmin, request, fetchBlogs]);

    if (auth.status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (!auth.user?.isAdmin) {
        return <LoadingPage />;
    }

    const isLoading = request.isLoading();
    const isError = request.isFailure();
    const error = request.error as { message?: string } | undefined;
    const hasNextPage = Boolean(nextStartKey);

    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={3}>
                <Stack
                    direction='row'
                    alignItems='center'
                    justifyContent='space-between'
                    flexWrap='wrap'
                    gap={2}
                >
                    <Stack direction='row' alignItems='center' gap={2}>
                        <IconButton component={Link} href='/admin' sx={{ display: 'flex' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant='h5'>Blog posts</Typography>
                    </Stack>
                    <Button
                        component={Link}
                        href='/admin/blog/new'
                        variant='contained'
                        startIcon={<AddIcon />}
                    >
                        New post
                    </Button>
                </Stack>

                {isLoading && blogs.length === 0 ? (
                    <LoadingPage />
                ) : isError ? (
                    <Typography color='error'>
                        {error?.message ?? 'Failed to load blog posts'}
                    </Typography>
                ) : blogs.length === 0 ? (
                    <Typography color='text.secondary'>No blog posts yet.</Typography>
                ) : (
                    <>
                        <Stack spacing={2}>
                            {blogs.map((blog) => (
                                <Card key={blog.id} variant='outlined'>
                                    <CardActionArea
                                        component={Link}
                                        href={`/admin/blog/${blog.id}`}
                                        sx={{ flex: 1, borderRadius: 1 }}
                                    >
                                        <CardContent>
                                            <Stack
                                                direction='row'
                                                justifyContent='space-between'
                                                alignItems='flex-start'
                                                flexWrap='wrap'
                                                gap={1}
                                            >
                                                <Stack sx={{ py: 0.5 }}>
                                                    <Typography variant='h6' component='h2'>
                                                        {blog.title}
                                                    </Typography>
                                                    <Typography
                                                        variant='body2'
                                                        color='text.secondary'
                                                    >
                                                        {blog.subtitle} • {blog.date}
                                                    </Typography>
                                                </Stack>
                                                <Chip
                                                    variant='filled'
                                                    color={
                                                        blog.status === 'PUBLISHED'
                                                            ? 'success'
                                                            : 'warning'
                                                    }
                                                    label={blog.status}
                                                />
                                            </Stack>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            ))}
                        </Stack>
                        {hasNextPage && (
                            <Button
                                variant='outlined'
                                onClick={() => fetchBlogs(nextStartKey)}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Loading…' : 'Load more'}
                            </Button>
                        )}
                    </>
                )}

                <RequestSnackbar request={request} />
            </Stack>
        </Container>
    );
}
