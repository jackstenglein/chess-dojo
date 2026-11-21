'use client';

import { getPuzzleRushLeaderboard } from '@/api/puzzleApi';
import { Request, useRequest } from '@/api/Request';
import { GetPuzzleRushLeaderboardResponse } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { useEffect } from 'react';

/** How many times to ask again while historical runs are still being added. */
const MAX_BACKFILL_REQUESTS = 30;

/** Loads the Dojo puzzle rush leaderboard, including runs saved before the board existed. */
export function usePuzzleRushLeaderboard(): Request<GetPuzzleRushLeaderboardResponse> {
    const request = useRequest<GetPuzzleRushLeaderboardResponse>();

    useEffect(() => {
        if (request.isSent()) {
            return;
        }
        request.onStart();

        const load = async () => {
            try {
                let response = await getPuzzleRushLeaderboard();
                for (
                    let attempt = 0;
                    !response.data.complete && attempt < MAX_BACKFILL_REQUESTS;
                    attempt++
                ) {
                    response = await getPuzzleRushLeaderboard();
                }
                request.onSuccess(response.data);
            } catch (err: unknown) {
                request.onFailure(err);
            }
        };
        void load();
    }, [request]);

    return request;
}
