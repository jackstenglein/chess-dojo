'use client';

import { getPuzzlebaseClient } from '@/components/puzzles/base/puzzlebaseClient';
import { ContributorProfileResponse } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Extension } from '@mui/icons-material';
import { Chip, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * A badge on a user's profile if they are a Puzzle Contributor to the Dojo PuzzleBase. It links to
 * the PuzzleBase and says how many puzzles they have added.
 *
 * TODO: translate before this is merged upstream, like the other profile chips.
 */
export default function PuzzleContributorChip({ username }: { username: string }) {
    const [profile, setProfile] = useState<ContributorProfileResponse>();

    useEffect(() => {
        let cancelled = false;
        getPuzzlebaseClient()
            .getProfile(username)
            .then((result) => {
                if (!cancelled) setProfile(result);
            })
            .catch(() => {
                // The badge is a nicety. If we cannot tell, show nothing.
            });
        return () => {
            cancelled = true;
        };
    }, [username]);

    if (!profile?.isContributor) {
        return null;
    }

    const { puzzleCount } = profile;
    return (
        <Tooltip
            title={`Dojo Puzzle Contributor · ${puzzleCount} ${puzzleCount === 1 ? 'puzzle' : 'puzzles'} added`}
        >
            <Chip
                component='a'
                href='/puzzles/base'
                icon={<Extension fontSize='small' />}
                label='Puzzle Contributor'
                variant='outlined'
                color='primary'
                size='small'
                clickable
            />
        </Tooltip>
    );
}
