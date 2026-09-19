'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { hasCreatedProfile } from '@/database/user';
import { DEFAULT_LOCALE, LOCALE_CODES, setLocaleCookie } from '@/i18n/locales';
import { usePathname, useRouter } from '@/i18n/navigation';
import { AxiosError } from 'axios';
import { useLocale } from 'next-intl';
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
    const currentLocale = useLocale();

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

    const username = user?.username;
    const language = user?.language;

    useEffect(() => {
        if (!username) return;

        // Unset means English (common/src/database/user.ts).
        const preferred = language || DEFAULT_LOCALE;
        if (!(LOCALE_CODES as readonly string[]).includes(preferred)) return;

        setLocaleCookie(preferred);

        // A hard navigation, as the profile editor does on a language change.
        // next-intl's replace with { locale: 'en' } emits /en/..., and the 308
        // back to the bare path drops the hash. usePathname() has no query or hash.
        if (preferred !== currentLocale) {
            const { search, hash } = window.location;
            const prefix = preferred === DEFAULT_LOCALE ? '' : `/${preferred}`;
            window.location.replace(`${prefix}${pathname}${search}${hash}`);
        }
    }, [username, language, currentLocale, pathname]);

    useEffect(() => {
        if (user && !hasCreatedProfile(user) && !validPathnames.includes(pathname)) {
            router.push(`/profile?redirectUri=${pathname}`);
        }
    }, [user, pathname, router]);

    return null;
}
