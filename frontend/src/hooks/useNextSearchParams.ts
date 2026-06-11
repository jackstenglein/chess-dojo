'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export interface NavigateOptions {
    /**
     * Whether to reset the current scroll position when navigating.
     * @default true
     */
    scroll?: boolean;
}

/**
 * Extends the default NextJS useSearchParams and useRouter hooks to
 * provide the search params, as well as functions to set and update
 * the search params.
 * @param defaultInit The default values to use if the current search parameters are missing a key.
 * @returns The search params and functions to set/update them.
 */
export function useNextSearchParams(defaultInit?: Record<string, string>) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const updateSearchParams = useCallback(
        (params: Record<string, string>, _options?: NavigateOptions) => {
            const newParams = mergeSearchParams(searchParams, params, true);
            window.history.pushState(null, '', `${pathname}?${newParams.toString()}`);
        },
        [searchParams, pathname],
    );

    const setSearchParams = useCallback(
        (params: Record<string, string>, options?: NavigateOptions) => {
            const newParams = new URLSearchParams(params);
            router.push(`${pathname}?${newParams.toString()}`, options);
        },
        [pathname, router],
    );

    return {
        searchParams: mergeSearchParams(searchParams, defaultInit),
        setSearchParams,
        updateSearchParams,
    };
}

/**
 * Merges the given URLSearchParams with the given merge object, potentially
 * overwriting the values in the search params. A new URLSearchParams object
 * is returned.
 * @param searchParams The search params to use as a base.
 * @param merge The merge object to combine with searchParams.
 * @param overwrite Whether to overwrite existing values in searchParams with new values in merge.
 * @returns The merged URLSearchParams.
 */
function mergeSearchParams(
    searchParams: URLSearchParams,
    merge?: Record<string, string>,
    overwrite = false,
): URLSearchParams {
    if (!merge) {
        return searchParams;
    }

    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(merge)) {
        if (overwrite || !searchParams.has(key)) {
            params.set(key, value);
        }
    }
    return params;
}
