import { ListBlogsResponse, listPublicBlogs } from '@/api/blogApi';
import { Link } from '@/components/navigation/Link';
import { Blog, DOJO_BLOG_OWNER } from '@jackstenglein/chess-dojo-common/src/blog/api';
import {
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardHeader,
    Container,
    Stack,
    Typography,
} from '@mui/material';
import Image from 'next/image';
import { BlogListItem } from './BlogListItem';
import items from './items';
import ShareButton from './shareButton/ShareButton';

// Forces NextJS to render this page on the server, so dynamic blog posts are fetched correctly.
export const dynamic = 'force-dynamic';

const BLOG_LIST_LIMIT = 50;

/**
 * Renders the main homepage of the blog.
 * Fetches published blogs from the API (dynamic list), then displays the static list below.
 */
export default async function BlogPage() {
    let dynamicBlogs: Blog[] = [];
    try {
        const res = await listPublicBlogs({
            owner: DOJO_BLOG_OWNER,
            limit: BLOG_LIST_LIMIT,
        });
        const data: ListBlogsResponse = res.data;
        dynamicBlogs = data.blogs;
    } catch {
        // Show static list only if API fails
    }

    return (
        <Container maxWidth='sm' sx={{ py: 5 }}>
            <Stack spacing={3}>
                {dynamicBlogs.map((blog) => (
                    <BlogListItem key={blog.id} blog={blog} />
                ))}
                {items.map((item, i) => (
                    <Card key={item.title}>
                        <CardActionArea LinkComponent={Link} href={item.href}>
                            {item.image && (
                                <Image
                                    src={item.image.src}
                                    alt={item.image.alt}
                                    style={{ width: '100%', height: 'auto' }}
                                    priority={dynamicBlogs.length === 0 && i === 0}
                                />
                            )}
                            <CardHeader title={item.title} subheader={item.subtitle} />

                            <CardContent>
                                <Typography variant='body1'>{item.body}</Typography>
                            </CardContent>
                        </CardActionArea>
                        <CardActions>
                            <ShareButton title={item.title} href={item.href} />
                        </CardActions>
                    </Card>
                ))}
            </Stack>
        </Container>
    );
}
