'use client';

import { pagesWithVideos } from '@/hooks/useRouter';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/i18n/locales';
import { Link as NextLink, usePathname } from '@/i18n/navigation';
import { LinkProps, Link as MuiLink } from '@mui/material';
import { useLocale } from 'next-intl';
import { NavigationGuardProviderContext } from 'node_modules/next-navigation-guard/dist/components/NavigationGuardProviderContext';
import { forwardRef, useContext } from 'react';

const LOCALE_PREFIX_REGEX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

function stripLocalePrefix(path: string): string {
    return path.replace(LOCALE_PREFIX_REGEX, '') || '/';
}

function isAbsoluteUrl(href: string): boolean {
    return /^[a-z]+:/i.test(href) || href.startsWith('//');
}

/**
 * Renders a MUI link to another page. If the link is relative and to a page
 * that needs the same headers as the current page, it uses the NextJS
 * Link component for client-side routing. Otherwise, it uses an a tag.
 *
 * Requires a NextIntlClientProvider ancestor in the component tree.
 *
 * @param props The props passed to the MUI Link component.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
    const pathname = usePathname();
    const locale = useLocale();
    const guardMapRef = useContext(NavigationGuardProviderContext);

    let useNextLink = true;
    let guardNavigation: React.MouseEventHandler<HTMLAnchorElement> | undefined = undefined;

    // Match pagesWithVideos against the unprefixed canonical path, since
    // those regexes in useRouter.ts have no locale segment.
    const rawHref = typeof props.href === 'string' ? props.href : undefined;
    const hrefIsExternal = rawHref !== undefined && isAbsoluteUrl(rawHref);
    const hrefStripped = rawHref && !hrefIsExternal ? stripLocalePrefix(rawHref) : undefined;

    if (!rawHref || hrefIsExternal) {
        useNextLink = false;
    } else {
        let currentHasVideo = false;
        let newHasVideo = false;

        for (const page of pagesWithVideos) {
            if (!currentHasVideo && pathname.match(page)) {
                currentHasVideo = true;
            }
            if (!newHasVideo && hrefStripped?.match(page)) {
                newHasVideo = true;
            }
        }

        useNextLink = currentHasVideo === newHasVideo;
    }

    if (!useNextLink && guardMapRef && rawHref) {
        // Guards compare against the unprefixed path; external URLs pass through.
        const guardTo = hrefStripped ?? rawHref;
        for (const guard of guardMapRef.current.values()) {
            const { enabled, callback } = guard;
            if (!enabled({ to: guardTo, type: 'push' })) {
                continue;
            }

            guardNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
                e.preventDefault();
                e.stopPropagation();
                props.onClick?.(e);

                let confirmed = callback({ to: guardTo, type: 'push' });
                if (typeof confirmed === 'boolean') {
                    confirmed = Promise.resolve(confirmed);
                }

                void confirmed.then((confirmed) => {
                    if (!confirmed) {
                        return;
                    }

                    guard.enabled = () => false;
                    // Absolute URLs pass through. Relative URLs get the active
                    // locale prefix — except under localePrefix: 'as-needed',
                    // the default locale uses bare paths.
                    if (hrefIsExternal || !hrefStripped) {
                        window.location.href = rawHref;
                    } else if (locale === DEFAULT_LOCALE) {
                        window.location.href = hrefStripped;
                    } else {
                        window.location.href = `/${locale}${hrefStripped}`;
                    }
                });
            };
            break;
        }
    }

    const component = props.component || (useNextLink ? NextLink : 'a');
    return (
        <MuiLink
            ref={ref}
            {...props}
            component={component}
            onClick={guardNavigation ?? props.onClick}
        />
    );
});
Link.displayName = 'Link';
