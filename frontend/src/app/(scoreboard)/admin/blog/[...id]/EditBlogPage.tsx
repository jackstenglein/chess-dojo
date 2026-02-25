'use client';

import { createBlog, getBlog, updateBlog } from '@/api/blogApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { MarkdownEditor } from '@/app/(scoreboard)/admin/blog/[...id]/MarkdownEditor';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import type { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import {
    BlogStatus,
    BlogStatuses,
    DOJO_BLOG_OWNER,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import {
    Button,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

export function EditBlogPage({ id }: { id?: string }) {
    const isCreate = !id?.trim();

    const auth = useAuth();
    const router = useRouter();
    const getRequest = useRequest<Blog>();
    const updateRequest = useRequest<Blog>();

    const [slug, setSlug] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [date, setDate] = useState<DateTime | null>(() => DateTime.now());
    const [status, setStatus] = useState<BlogStatus>(BlogStatuses.DRAFT);
    const [content, setContent] = useState('');

    const isInvalid =
        !title.trim() || !subtitle.trim() || !date?.isValid || !slug.trim() || !description.trim();

    useEffect(() => {
        if (auth.status !== AuthStatus.Loading && !auth.user?.isAdmin) {
            router.replace('/profile');
        }
    }, [auth.status, auth.user?.isAdmin, router]);

    useEffect(() => {
        if (!id?.trim() || !auth.user?.isAdmin || getRequest.isSent()) {
            return;
        }
        getRequest.onStart();
        getBlog({ owner: DOJO_BLOG_OWNER, id })
            .then((res) => {
                const blog = res.data;
                setSlug(blog.id);
                setTitle(blog.title);
                setSubtitle(blog.subtitle);
                setDescription(blog.description ?? '');
                setCoverImage(blog.coverImage ?? '');
                setDate(blog.date ? DateTime.fromISO(blog.date) : null);
                setStatus(blog.status);
                setContent(blog.content);
                getRequest.onSuccess(blog);
            })
            .catch((err) => getRequest.onFailure(err));
    }, [id, auth.user?.isAdmin, getRequest]);

    const handleSave = () => {
        if (isInvalid) {
            return;
        }

        updateRequest.onStart();
        const saveFunc = isCreate ? createBlog : updateBlog;
        saveFunc({
            owner: DOJO_BLOG_OWNER,
            id: slug.trim(),
            title: title.trim(),
            subtitle: subtitle.trim(),
            description: description.trim(),
            coverImage: coverImage.trim(),
            date: date.toISODate() ?? '',
            content,
            status,
        })
            .then((resp) => updateRequest.onSuccess(resp.data))
            .catch((err) => updateRequest.onFailure(err));
    };

    if (auth.status === AuthStatus.Loading || !auth.user?.isAdmin) {
        return <LoadingPage />;
    }

    const isLoading = getRequest.isLoading();
    const getError = getRequest.error as { message?: string } | undefined;

    if (!isCreate && isLoading && !getRequest.data) {
        return <LoadingPage />;
    }

    if (!isCreate && getRequest.isFailure()) {
        return (
            <Container sx={{ py: 5 }}>
                <Stack spacing={2}>
                    <Typography color='error'>
                        {getError?.message ?? 'Blog post not found'}
                    </Typography>
                    <RequestSnackbar request={getRequest} />
                </Stack>
            </Container>
        );
    }

    return (
        <Container sx={{ py: 5 }}>
            <Stack spacing={3}>
                <Stack direction='row' alignItems='center' gap={2}>
                    <Typography variant='h5'>
                        {isCreate ? 'Create blog post' : 'Edit blog post'}
                    </Typography>
                </Stack>

                <Typography color='text.secondary'>
                    {isCreate ? 'Create a new blog post.' : 'Update the blog post.'} Use the Write
                    tab to edit markdown and the Preview tab to see how it will look when published.
                </Typography>

                <TextField
                    label='URL slug'
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder='e.g. dojo-digest-27'
                    helperText='The page URL as a child of /blog/. For example, enter your-slug for the URL /blog/your-slug. This cannot be changed after creation.'
                    fullWidth
                    required
                    disabled={!isCreate}
                />

                <TextField
                    label='Title'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g. Dojo Digest 27'
                    fullWidth
                    required
                />

                <TextField
                    label='Subtitle'
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder='e.g. Dojo Digest 27'
                    fullWidth
                    required
                />

                <TextField
                    label='Description'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    helperText='Short overview of what the blog post is about (used in metadata and in list preview)'
                    fullWidth
                    required
                    multiline
                    minRows={2}
                />

                <TextField
                    label='Cover image URL'
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder='https://...'
                    fullWidth
                    helperText='Optional URL of a cover image (used in list preview and when sharing on social media). Should be 1200x630 for best social media preview.'
                />

                <DatePicker label='Date' value={date} onChange={(newValue) => setDate(newValue)} />

                <FormControl fullWidth>
                    <InputLabel id='blog-status-label'>Status</InputLabel>
                    <Select
                        labelId='blog-status-label'
                        label='Status'
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <MenuItem value={BlogStatuses.DRAFT}>Draft</MenuItem>
                        <MenuItem value={BlogStatuses.PUBLISHED}>Published</MenuItem>
                    </Select>
                </FormControl>

                <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder='Write your blog post in markdown...'
                    minHeight={400}
                    title={title}
                    subtitle={subtitle}
                    description={description}
                    coverImage={coverImage}
                    date={date?.toISODate() ?? ''}
                />

                <Stack direction='row' gap={2} justifyContent='flex-end'>
                    <Button component={Link} href='/admin/blog' variant='outlined'>
                        Cancel
                    </Button>
                    <Button
                        variant='contained'
                        onClick={handleSave}
                        disabled={isInvalid}
                        loading={updateRequest.isLoading()}
                    >
                        {isCreate ? 'Create post' : 'Update post'}
                    </Button>
                </Stack>

                <RequestSnackbar
                    request={updateRequest}
                    showSuccess
                    defaultSuccessMessage={isCreate ? 'Blog post created' : 'Blog post saved'}
                />
            </Stack>
        </Container>
    );
}
