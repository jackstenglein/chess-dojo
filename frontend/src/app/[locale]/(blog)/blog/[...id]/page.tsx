import { getPublicBlog } from '@/api/blogApi';
import { Box, Stack, Typography } from '@mui/material';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogMarkdown } from '../../../(scoreboard)/admin/blog/[...id]/MarkdownEditor';
import { Container } from '../common/Container';
import { Footer } from '../common/Footer';
import { Header } from '../common/Header';
import BlogComments from './BlogComments';

const BLOG_OWNER = 'chessdojo';

async function fetchBlog(id: string) {
    const response = await getPublicBlog({ owner: BLOG_OWNER, id });
    return response.data;
}

export async function generateMetadata({
    params,
}: PageProps<'/[locale]/blog/[...id]'>): Promise<Metadata> {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    const blog = await fetchBlog(id);
    if (!blog) {
        return { title: 'Not Found' };
    }
    const description = blog.description ?? blog.subtitle;
    return {
        title: blog.title,
        description,
        openGraph: {
            title: blog.title,
            description,
            ...(blog.coverImage && { images: [{ url: blog.coverImage }] }),
        },
    };
}

export default async function BlogPage({ params }: PageProps<'/[locale]/blog/[...id]'>) {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    const blog = await fetchBlog(id);

    if (!blog) {
        notFound();
    }

    return (
        <Container>
            <Header title={blog.title} subtitle={blog.subtitle} />
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                {blog.date} · {Math.max(1, Math.ceil(blog.content.split(/\s+/).length / 220))} min
                read
            </Typography>
            {blog.coverImage && (
                <Box
                    component='img'
                    src={blog.coverImage}
                    alt={blog.title}
                    sx={{ width: '100%', height: 'auto', borderRadius: 2, display: 'block', mb: 4 }}
                />
            )}
            <Stack
                sx={{
                    mt: 3,
                }}
            >
                <BlogMarkdown>{blog.content}</BlogMarkdown>
                <Footer utmCampaign={`blog-${id}`} />
                <BlogComments comments={blog.comments ?? null} owner={BLOG_OWNER} id={id} />
            </Stack>
        </Container>
    );
}
