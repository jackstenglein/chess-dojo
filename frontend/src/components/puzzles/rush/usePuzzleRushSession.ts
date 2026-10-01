'use client';

import { getPuzzleRushSession } from '@/api/puzzleApi';
import { Request, useRequest } from '@/api/Request';
import { PuzzleRushSession } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { useEffect } from 'react';

/**
 * Fetches the puzzle rush run with the given createdAt timestamp for the current user.
 * @param createdAt The createdAt timestamp of the run.
 * @returns The request tracker for the run.
 */
export function usePuzzleRushSession(createdAt: string): Request<PuzzleRushSession> {
    const request = useRequest<PuzzleRushSession>();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            getPuzzleRushSession(createdAt)
                .then((response) => request.onSuccess(response.data.session))
                .catch((err: unknown) => request.onFailure(err));
        }
    }, [request, createdAt]);

    return request;
}
