'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { hasCreatedProfile } from '@/database/user';
import { AxiosError } from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const validPathnames = ['/help', '/profile'];

/**
 * If the user is signed in and has not completed their profile, this
 * component redirects them to the profile creator page. If the user is not
 * signed in, then no redirection happens. This component is also responsible
 * for verifying the user's Wix access.
 */
export function RequireProfile() {
    const { status, user, updateUser } = useAuth();
    const api = useApi();
    const request = useRequest();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === AuthStatus.Authenticated && !request.isSent()) {
            request.onStart();
            api.checkUserAccess()
                .then((resp) => {
                    request.onSuccess();
                    updateUser(resp.data);
                })
                .catch((err: AxiosError) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, status, updateUser, user]);

    useEffect(() => {
        if (user && !hasCreatedProfile(user) && !validPathnames.includes(pathname)) {
            router.push(`/profile?redirectUri=${pathname}`);
        }
    }, [user, pathname, router]);

    return null;
}
