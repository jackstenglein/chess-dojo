import { Link } from '@/components/navigation/Link';
import { Container, Divider, Stack, Typography } from '@mui/material';

export default function Page() {
    return (
        <Container sx={{ py: 5 }}>
            <Typography variant='h5'>Admin Tools</Typography>
            <Divider />
            <Stack sx={{ mt: 2 }} spacing={1}>
                <Link href='/admin/game-review'>Update Game Review Cohorts</Link>
                <Link href='/admin/blog'>Blog posts</Link>
                <Link href='/admin/blog/new'>Create Blog Post</Link>
            </Stack>
        </Container>
    );
}
