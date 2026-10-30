import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { getConfig } from '@/config';
import { FollowerEntry } from '@/database/follower';
import { User } from '@/database/user';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Check, Favorite, FavoriteBorder, Link as LinkIcon, Settings } from '@mui/icons-material';
import {
    Card,
    CardContent,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Bio from './Bio';
import CoachChip from './CoachChip';
import CreatedAtChip from './CreatedAtChip';
import DiscordChip from './DiscordChip';
import InactiveChip from './InactiveChip';
import TimezoneChip from './TimezoneChip';

const BASE_URL = getConfig().baseUrl;

/**
 * Renders a card with the info for the given user.
 * @param user The user to render info for.
 * @param setFollowerCount Callback invoked to set the cached follower count for the given user.
 */
export function UserCard({
    user,
    setFollowerCount,
}: {
    user: User;
    setFollowerCount: (count: number) => void;
}) {
    const t = useTranslations('profile.info.userCard');
    const { user: viewer, updateUser } = useAuth();
    const isOwner = viewer?.username === user.username;
    const followRequest = useRequest<FollowerEntry>();
    const api = useApi();
    const [copied, setCopied] = useState('');

    const username = user.username;
    useEffect(() => {
        if (!isOwner && !followRequest.isSent()) {
            followRequest.onStart();
            api.getFollower(username)
                .then((resp) => {
                    followRequest.onSuccess(resp.data || undefined);
                })
                .catch((err) => {
                    followRequest.onFailure(err);
                });
        }
    }, [api, isOwner, followRequest, username]);

    const onFollow = () => {
        if (isOwner || !viewer) {
            return;
        }

        const action = followRequest.data ? 'unfollow' : 'follow';

        followRequest.onStart();
        api.editFollower(user.username, action)
            .then((resp) => {
                const incrementalCount = action === 'follow' ? 1 : -1;
                updateUser({
                    followingCount: viewer.followingCount + incrementalCount,
                });
                setFollowerCount(user.followerCount + incrementalCount);
                followRequest.onSuccess(resp.data || undefined);
            })
            .catch((err) => {
                followRequest.onFailure(err);
            });
    };

    const onCopyUrl = async () => {
        await navigator.clipboard.writeText(`${BASE_URL}/profile/${user.username}`);
        setCopied('url');
        setTimeout(() => setCopied(''), 3000);
    };

    return (
        <Card sx={{ position: 'relative', height: 1 }}>
            <RequestSnackbar request={followRequest} />

            <Stack
                direction='row'
                sx={{
                    position: 'absolute',
                    right: 'var(--mui-spacing)',
                    top: 'calc(0.5 * var(--mui-spacing))',
                }}
            >
                <Tooltip title={t('copyProfileUrl')} onClick={onCopyUrl}>
                    <IconButton>
                        {copied === 'url' ? (
                            <Check sx={{ color: 'text.secondary' }} />
                        ) : (
                            <LinkIcon
                                sx={{ color: 'text.secondary', transform: 'rotate(90deg)' }}
                            />
                        )}
                    </IconButton>
                </Tooltip>

                {isOwner ? (
                    <Tooltip title={t('editProfileAndSettings')}>
                        <IconButton id='edit-profile-button' component={Link} href='/profile/edit'>
                            <Settings sx={{ color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Tooltip title={followRequest.data ? t('unfollow') : t('follow')}>
                        <IconButton onClick={onFollow} loading={followRequest.isLoading()}>
                            {followRequest.isLoading() ? (
                                <CircularProgress size={24} />
                            ) : followRequest.data ? (
                                <Favorite sx={{ color: 'text.secondary' }} />
                            ) : (
                                <FavoriteBorder sx={{ color: 'text.secondary' }} />
                            )}
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            <CardContent>
                <Stack
                    sx={{
                        alignItems: 'center',
                        mb: -1,
                    }}
                >
                    <Avatar user={user} />
                    <Typography
                        component='h1'
                        sx={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            lineHeight: 1.25,
                            textAlign: 'center',
                            mt: 1.5,
                        }}
                    >
                        {user.displayName}
                    </Typography>

                    <Stack
                        direction='row'
                        spacing={0.75}
                        sx={{
                            alignItems: 'center',
                            mt: 0.5,
                        }}
                    >
                        <CohortIcon
                            cohort={user.dojoCohort}
                            size={22}
                            tooltip={t('memberOfCohort', { cohort: user.dojoCohort })}
                        />
                        <Typography
                            sx={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'text.secondary',
                            }}
                        >
                            {user.dojoCohort}
                        </Typography>
                    </Stack>

                    <Typography
                        variant='body2'
                        sx={{
                            mt: 1,
                            color: 'text.secondary',
                            '& a': { color: 'inherit', textDecoration: 'none' },
                            '& a:hover': { color: 'text.primary' },
                            '& strong': { color: 'text.primary', fontWeight: 600 },
                        }}
                        data-testid='follow-counts'
                    >
                        <Link href={`/profile/${user.username}/followers`}>
                            <strong>{user.followerCount}</strong>{' '}
                            {user.followerCount === 1 ? t('follower') : t('followers')}
                        </Link>
                        {' · '}
                        <Link href={`/profile/${user.username}/following`}>
                            <strong>{user.followingCount}</strong> {t('following')}
                        </Link>
                    </Typography>

                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            gap: 0.75,
                            alignItems: 'center',
                            justifyContent: 'center',
                            mt: 2,
                            mb: 2,
                            // Quiet, neutral chips rather than coloured ones.
                            '& .MuiChip-root': {
                                borderColor: 'divider',
                                color: 'text.secondary',
                            },
                            '& .MuiChip-icon': { color: 'text.secondary' },
                        }}
                    >
                        <CoachChip user={user} />
                        <InactiveChip user={user} />
                        <DiscordChip username={user.discordUsername} id={user.discordId} />
                        <TimezoneChip timezone={user.timezoneOverride} />
                        <CreatedAtChip createdAt={user.createdAt} />
                    </Stack>

                    <Bio bio={user.bio} />
                </Stack>
            </CardContent>
        </Card>
    );
}
