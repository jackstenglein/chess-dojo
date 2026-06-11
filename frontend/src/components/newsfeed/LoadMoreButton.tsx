import { Request } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Button, Stack, Typography } from '@mui/material';

interface LoadMoreButtonProps<T> {
    request: Request<T>;
    hasMore?: boolean;
    since?: string;
    startKey?: Record<string, string>;
    onLoadMore: () => void;
}

function LoadMoreButton<T>({
    request,
    hasMore,
    since,
    startKey,
    onLoadMore,
}: LoadMoreButtonProps<T>) {
    const { user } = useAuth();

    if (hasMore || Object.values(startKey || {}).length > 0) {
        return (
            <Stack alignItems='center' spacing={1}>
                <Button variant='contained' loading={request.isLoading()} onClick={onLoadMore}>
                    Load More
                </Button>
            </Stack>
        );
    }

    if (since) {
        const date = new Date(since);
        return (
            <Stack alignItems='center' spacing={1}>
                <CheckCircleOutlineIcon color='success' fontSize='large' />

                <Stack alignItems='center'>
                    <Typography fontWeight='bold' textAlign='center'>
                        You're all caught up
                    </Typography>
                    <Typography color='text.secondary' textAlign='center'>
                        You've seen all new posts since{' '}
                        {toDojoDateString(date, user?.timezoneOverride)}
                    </Typography>

                    <Button onClick={onLoadMore} sx={{ textTransform: 'none' }}>
                        View older posts
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack alignItems='center' spacing={1}>
            <CheckCircleOutlineIcon color='success' fontSize='large' />

            <Stack alignItems='center'>
                <Typography fontWeight='bold' textAlign='center'>
                    No More Posts
                </Typography>
                <Typography color='text.secondary' textAlign='center'>
                    You've seen all posts in your newsfeed
                </Typography>
            </Stack>
        </Stack>
    );
}

export default LoadMoreButton;
