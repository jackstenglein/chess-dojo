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

    useEffect(() => {
        const preferred = user?.language;
        if (!preferred) return;
        // Persist the cross-device preference into the cookie so the
        // middleware picks it up on bare-URL visits. setLocaleCookie silently
        // no-ops on an unsupported value, and the guard below also gates the
        // URL redirect - a stale user.language outside SUPPORTED_LOCALES
        // leaves both untouched rather than corrupting state.
        setLocaleCookie(preferred);
        if (
            preferred !== currentLocale &&
            (LOCALE_CODES as readonly string[]).includes(preferred)
        ) {
            // next-intl 4.x: passing { locale } always emits a prefixed URL
            // even under as-needed (to let the cookie write before hydration).
            // For the default locale we drop the option and rely on the cookie
            // set above, so the URL lands at the bare path instead of /en/...
            if (preferred === DEFAULT_LOCALE) {
                router.replace(pathname);
            } else {
                router.replace(pathname, { locale: preferred });
            }
        }
    }, [user?.language, currentLocale, router, pathname]);

    useEffect(() => {
        if (user && !hasCreatedProfile(user) && !validPathnames.includes(pathname)) {
            router.push(`/profile?redirectUri=${pathname}`);
        }
    }, [user, pathname, router]);

    return null;
}
