import { Request } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('newsfeed');
    const { user } = useAuth();

    if (hasMore || Object.values(startKey || {}).length > 0) {
        return (
            <Stack
                spacing={1}
                sx={{
                    alignItems: 'center',
                }}
            >
                <Button variant='contained' loading={request.isLoading()} onClick={onLoadMore}>
                    {t('loadMore')}
                </Button>
            </Stack>
        );
    }

    if (since) {
        const date = new Date(since);
        return (
            <Stack
                spacing={1}
                sx={{
                    alignItems: 'center',
                }}
            >
                <CheckCircleOutlinedIcon color='success' fontSize='large' />

                <Stack
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 'bold',
                            textAlign: 'center',
                        }}
                    >
                        {t('allCaughtUp')}
                    </Typography>
                    <Typography
                        sx={{
                            color: 'text.secondary',
                            textAlign: 'center',
                        }}
                    >
                        {t('seenAllSince', {
                            date: toDojoDateString(date, user?.timezoneOverride),
                        })}
                    </Typography>

                    <Button onClick={onLoadMore} sx={{ textTransform: 'none' }}>
                        {t('viewOlderPosts')}
                    </Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack
            spacing={1}
            sx={{
                alignItems: 'center',
            }}
        >
            <CheckCircleOutlinedIcon color='success' fontSize='large' />

            <Stack
                sx={{
                    alignItems: 'center',
                }}
            >
                <Typography
                    sx={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                    }}
                >
                    {t('noMorePosts')}
                </Typography>
                <Typography
                    sx={{
                        color: 'text.secondary',
                        textAlign: 'center',
                    }}
                >
                    {t('seenAllPosts')}
                </Typography>
            </Stack>
        </Stack>
    );
}

export default LoadMoreButton;
