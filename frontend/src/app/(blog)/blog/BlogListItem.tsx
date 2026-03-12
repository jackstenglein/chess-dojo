import { Link } from '@/components/navigation/Link';
import { Blog } from '@jackstenglein/chess-dojo-common/src/blog/api';
import {
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardHeader,
    CardMedia,
    Typography,
} from '@mui/material';
import ShareButton from './shareButton/ShareButton';

export function BlogListItem({ blog, disabled }: { blog: Partial<Blog>; disabled?: boolean }) {
    return (
        <Card data-testid={`blog-list-item-${blog.id}`} key={blog.id}>
            <CardActionArea LinkComponent={Link} href={`/blog/${blog.id}`} disabled={disabled}>
                {blog.coverImage && (
                    <CardMedia
                        component='img'
                        image={blog.coverImage}
                        alt=''
                        sx={{ width: '100%', height: 'auto' }}
                    />
                )}
                <CardHeader
                    data-testid='list-item-title'
                    title={blog.title}
                    subheader={[blog.subtitle, blog.date].filter(Boolean).join(' • ')}
                />
                <CardContent>
                    <Typography data-testid='list-item-description' variant='body1'>
                        {blog.description}
                    </Typography>
                </CardContent>
            </CardActionArea>
            <CardActions>
                <ShareButton title={blog.title ?? ''} href={`/blog/${blog.id}`} />
            </CardActions>
        </Card>
    );
}
