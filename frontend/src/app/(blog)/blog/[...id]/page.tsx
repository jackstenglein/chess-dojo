import { getPublicBlog } from '@/api/blogApi';
import { Stack } from '@mui/material';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlogMarkdown } from '../../../(scoreboard)/admin/blog/[...id]/MarkdownEditor';
import BlogComments from './BlogComments';
import { Container } from '../common/Container';
import { Footer } from '../common/Footer';
import { Header } from '../common/Header';

const BLOG_OWNER = 'chessdojo';

async function fetchBlog(id: string) {
    const response = await getPublicBlog({ owner: BLOG_OWNER, id });
    return response.data;
}

export async function generateMetadata({ params }: PageProps<'/blog/[...id]'>): Promise<Metadata> {
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

export default async function BlogPage({ params }: PageProps<'/blog/[...id]'>) {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    const blog = await fetchBlog(id);

    if (!blog) {
        notFound();
    }

    return (
        <Container>
            <Header title={blog.title} subtitle={blog.subtitle} />
            <Stack mt={3}>
                <BlogMarkdown>{blog.content}</BlogMarkdown>
                <Footer utmCampaign={`blog-${id}`} />
                <BlogComments
                    comments={blog.comments ?? null}
                    owner={BLOG_OWNER}
                    id={id}
                />
            </Stack>
        </Container>
    );
}
