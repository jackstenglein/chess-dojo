'use client';

import { FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { GuessStatsPanel } from './GuessStatsPanel';
import { MatchRound } from './lichessFeed';

/**
 * The Admin tab: guess timing stats for any game, starting on the game that
 * was open. Only admins see the tab, and the API checks it again.
 */
export function AdminView({
    rounds,
    initialRoundId,
}: {
    rounds: MatchRound[];
    initialRoundId?: string;
}) {
    const [roundId, setRoundId] = useState(initialRoundId ?? rounds[0]?.id);

    return (
        <Stack spacing={2} sx={{ maxWidth: 900 }} data-testid='admin-view'>
            <Stack
                direction='row'
                spacing={2}
                sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
            >
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                    Admin
                </Typography>
                <FormControl size='small' sx={{ minWidth: 240 }}>
                    <InputLabel id='admin-game-label'>Game</InputLabel>
                    <Select
                        labelId='admin-game-label'
                        label='Game'
                        value={roundId ?? ''}
                        onChange={(e) => setRoundId(e.target.value)}
                    >
                        {rounds.map((r) => (
                            <MenuItem key={r.id} value={r.id}>
                                {r.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>
            <GuessStatsPanel key={roundId} roundId={roundId} autoLoad />
        </Stack>
    );
}
