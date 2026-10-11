'use client';

import { Vote } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { ThumbDown, ThumbDownOutlined, ThumbUp, ThumbUpOutlined } from '@mui/icons-material';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { PuzzlebaseClient } from './puzzlebaseClient';

interface PuzzleVoteProps {
    client: PuzzlebaseClient;
    puzzleId: string;
    /** The member's vote from an earlier time, if they have one. */
    initialVote?: 1 | -1;
    /** Bigger, for when there is room. */
    large?: boolean;
}

/**
 * Thumbs up and thumbs down for a puzzle that was just played. A vote shows at once and is saved
 * in the background; pressing the same thumb again takes it back. If saving fails the thumbs go
 * back to how they were.
 */
export function PuzzleVote({ client, puzzleId, initialVote, large }: PuzzleVoteProps) {
    const [vote, setVote] = useState<Vote>(initialVote ?? 0);
    const [failed, setFailed] = useState(false);

    const choose = (picked: 1 | -1) => {
        const before = vote;
        const after: Vote = vote === picked ? 0 : picked;
        setVote(after);
        setFailed(false);
        client.vote(puzzleId, after).catch(() => {
            setVote(before);
            setFailed(true);
        });
    };

    return (
        <Stack sx={{ alignItems: 'center', gap: 0.5 }}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                <Typography variant={large ? 'body1' : 'body2'} color='text.secondary'>
                    Was this a good puzzle?
                </Typography>
                <Tooltip title='Good puzzle'>
                    <IconButton
                        size={large ? 'medium' : 'small'}
                        aria-label='Thumbs up'
                        aria-pressed={vote === 1}
                        color={vote === 1 ? 'success' : 'default'}
                        onClick={() => choose(1)}
                    >
                        {vote === 1 ? (
                            <ThumbUp fontSize={large ? 'medium' : 'small'} />
                        ) : (
                            <ThumbUpOutlined fontSize={large ? 'medium' : 'small'} />
                        )}
                    </IconButton>
                </Tooltip>
                <Tooltip title='Not a good puzzle'>
                    <IconButton
                        size={large ? 'medium' : 'small'}
                        aria-label='Thumbs down'
                        aria-pressed={vote === -1}
                        color={vote === -1 ? 'error' : 'default'}
                        onClick={() => choose(-1)}
                    >
                        {vote === -1 ? (
                            <ThumbDown fontSize={large ? 'medium' : 'small'} />
                        ) : (
                            <ThumbDownOutlined fontSize={large ? 'medium' : 'small'} />
                        )}
                    </IconButton>
                </Tooltip>
            </Stack>
            {failed && (
                <Typography variant='caption' color='error'>
                    Couldn’t save your vote. Try again.
                </Typography>
            )}
        </Stack>
    );
}
