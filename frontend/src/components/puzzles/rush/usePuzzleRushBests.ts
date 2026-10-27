'use client';

import { getPuzzleRushSummary } from '@/api/puzzleApi';
import { Request, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { DefaultTimezone } from '@/components/calendar/filters/TimezoneSelector';
import { PuzzleRushBests } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { useEffect } from 'react';

/**
 * Returns the IANA timezone that puzzle rush uses for "today" and "this week".
 * A chosen timezone override wins. Otherwise the browser's timezone is used, which
 * is what the profile calls the default timezone.
 * @param timezoneOverride The player's saved timezone override.
 * @returns An IANA timezone.
 */
export function puzzleRushTimeZone(timezoneOverride?: string): string {
    if (timezoneOverride && timezoneOverride !== DefaultTimezone) {
        return timezoneOverride;
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Loads the current player's puzzle rush bests for all time, this week, and today. */
export function usePuzzleRushBests(): Request<PuzzleRushBests> {
    const { user } = useAuth();
    const timeZone = puzzleRushTimeZone(user?.timezoneOverride);
    const request = useRequest<PuzzleRushBests>();

    useEffect(() => {
        if (request.isSent()) {
            return;
        }
        request.onStart();
        getPuzzleRushSummary(timeZone)
            .then((response) => request.onSuccess(response.data.bests))
            .catch((err: unknown) => request.onFailure(err));
    }, [request, timeZone]);

    return request;
}
