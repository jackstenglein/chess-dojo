import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { ListFollowersResponse } from '@/api/userApi';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { FollowerEntry } from '@/database/follower';
import LoadingPage from '@/loading/LoadingPage';
import Avatar from '@/profile/Avatar';
import { Button, Stack, Typography } from '@mui/material';
import React, { useEffect } from 'react';

export const FollowersList = ({
    username,
    type,
}: {
    username: string;
    type: 'following' | 'followers';
}) => {
    const api = useApi();
    const isFollowing = type === 'following';
    const request = useRequest<ListFollowersResponse>();
    const auth = useAuth();
    const currentUser = auth.user;

    const searchFunc = isFollowing ? api.listFollowing : api.listFollowers;

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            searchFunc(username || '')
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, username, searchFunc]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (!request.data?.followers || request.data.followers.length === 0) {
        return (
            <>
                <RequestSnackbar request={request} />
                <Typography>No users found</Typography>
            </>
        );
    }

    const onUnfollow = (poster: string) => {
        if (currentUser) {
            auth.updateUser({ followingCount: currentUser.followingCount - 1 });
        }
        request.onSuccess({
            followers: request.data?.followers.filter((f) => f.poster !== poster) || [],
            lastEvaluatedKey: request.data?.lastEvaluatedKey || '',
        });
    };

    return (
        <Stack spacing={4}>
            <RequestSnackbar request={request} />

            {request.data.followers.map((f) => (
                <FollowerListItem
                    key={isFollowing ? f.poster : f.follower}
                    entry={f}
                    isFollowing={isFollowing}
                    onUnfollow={
                        isFollowing && username === currentUser?.username ? onUnfollow : undefined
                    }
                />
            ))}
        </Stack>
    );
};

interface FollowerListItemProps {
    entry: FollowerEntry;
    isFollowing: boolean;
    onUnfollow?: (poster: string) => void;
}

const FollowerListItem: React.FC<FollowerListItemProps> = ({ entry, isFollowing, onUnfollow }) => {
    const unfollowRequest = useRequest<FollowerEntry>();
    const api = useApi();

    const onClick = () => {
        if (!onUnfollow) {
            return;
        }

        unfollowRequest.onStart();
        api.editFollower(entry.poster, 'unfollow')
            .then(() => {
                onUnfollow(entry.poster);
            })
            .catch((err) => {
                unfollowRequest.onFailure(err);
            });
    };

    return (
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <RequestSnackbar request={unfollowRequest} />

            <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar
                    username={isFollowing ? entry.poster : entry.follower}
                    displayName={isFollowing ? entry.posterDisplayName : entry.followerDisplayName}
                    size={{ xs: '40px', sm: '52px' }}
                    fontSize={{ xs: '0.76rem', sm: '0.98rem' }}
                />

                <Link href={`/profile/${isFollowing ? entry.poster : entry.follower}`}>
                    {isFollowing ? entry.posterDisplayName : entry.followerDisplayName}
                </Link>
            </Stack>

            {onUnfollow && (
                <Button variant='contained' loading={unfollowRequest.isLoading()} onClick={onClick}>
                    Unfollow
                </Button>
            )}
        </Stack>
    );
};

export default FollowersList;
