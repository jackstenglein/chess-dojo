'use client';

import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import FollowersList from '@/components/profile/followers/FollowersList';
import UserInfo from '@/components/profile/info/UserInfo';
import { User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { Container, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export function FollowersPage({
    username,
    type,
}: {
    username: string;
    type: 'followers' | 'following';
}) {
    const t = useTranslations('profile.followers');
    const api = useApi();
    const { user: currentUser } = useAuth();
    const request = useRequest<User>();

    const currentUserProfile = !username || username === currentUser?.username;

    useEffect(() => {
        if (!currentUserProfile && !request.isSent()) {
            request.onStart();
            api.getUserPublic(username)
                .then((response) => {
                    request.onSuccess(response.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, currentUserProfile, request, username]);

    const user = currentUserProfile ? currentUser : request.data;

    if (!user && request.isLoading()) {
        return <LoadingPage />;
    } else if (!user) {
        return <NotFoundPage />;
    }

    const title = type === 'followers' ? t('followersTitle') : t('followingTitle');

    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <Stack>
                <UserInfo user={user} linkUsername />

                <Typography mt={5} variant='h5'>
                    {title}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <FollowersList username={username} type={type} />
            </Stack>
        </Container>
    );
}

export default FollowersPage;
