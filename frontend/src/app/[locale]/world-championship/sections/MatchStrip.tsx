'use client';

import { Box, Stack, Typography } from '@mui/material';
import { Condensed, EASE_OUT, HAIRLINE, MUTED, ORANGE } from '../../class/sections/shared';
import { GAME_DATES, MATCH, TIEBREAK_DATE } from '../config';
import { MATCH_SUMMARY, THE_MATCH } from '../content';
import { Draft, formatGameDate, gamesForScore, scoreOf } from '../prediction';

/** Games are played in blocks of three with a rest day between them. */
const BLOCKS = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
    [13, 14],
];

/** "Nov 24" for a date like "2026-11-24". */
function shortDate(isoDate: string): string {
    const [month, day] = formatGameDate(isoDate).split(' ');
    return `${month.slice(0, 3)} ${day}`;
}

/** What a visitor's picks say about the shape of the match, one sentence per pick. */
export function matchSummary(draft: Draft): string[] {
    const lines: string[] = [];
    const score = scoreOf(draft);
    if (score) {
        const { games, orFewer } = gamesForScore(score);
        const date = formatGameDate(GAME_DATES[games - 1]);
        if (draft.tiebreaks) {
            lines.push(MATCH_SUMMARY.tiebreaks(formatGameDate(TIEBREAK_DATE)));
        } else {
            lines.push(
                orFewer ? MATCH_SUMMARY.endsBy(games, date) : MATCH_SUMMARY.endsAfter(games, date),
            );
        }
    }
    if (draft.firstDecisiveGame === 'none') {
        lines.push(MATCH_SUMMARY.allDrawn);
    } else if (draft.firstDecisiveGame) {
        lines.push(
            MATCH_SUMMARY.firstWin(
                draft.firstDecisiveGame,
                formatGameDate(GAME_DATES[draft.firstDecisiveGame - 1]),
            ),
        );
    }
    return lines;
}

const dateSx = {
    display: 'block',
    mt: 0.75,
    color: MUTED,
    fontSize: '0.72rem',
    whiteSpace: 'nowrap',
} as const;

/**
 * The match as a row of 14 games, grouped the way the schedule groups them. A
 * visitor's picks are drawn onto it: the game of the first win is filled in,
 * and games their score says will not be played are struck out.
 */
export function MatchStrip({
    draft = {},
    dates = false,
    size = 'regular',
}: {
    draft?: Draft;
    /** Shows the date each block starts on. */
    dates?: boolean;
    size?: 'regular' | 'small';
}) {
    const score = scoreOf(draft);
    const lastGame = score ? gamesForScore(score).games : MATCH.games;
    const firstWin = draft.firstDecisiveGame;
    const cellHeight = size === 'small' ? 20 : 28;
    const fontSize = size === 'small' ? '0.68rem' : '0.8rem';

    return (
        <Box
            role='img'
            aria-label={`${THE_MATCH.stripLabel}. ${matchSummary(draft).join(' ')}`.trim()}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: '5px', sm: '10px' } }}
        >
            {BLOCKS.map((block) => (
                <Box key={block[0]} sx={{ flex: block.length, minWidth: 0 }}>
                    <Stack direction='row' sx={{ gap: '2px' }}>
                        {block.map((game) => {
                            const isFirstWin = firstWin === game;
                            const unplayed = game > lastGame;
                            return (
                                <Box
                                    key={game}
                                    sx={{
                                        flex: 1,
                                        height: cellHeight,
                                        display: 'grid',
                                        placeItems: 'center',
                                        borderRadius: '3px',
                                        fontSize,
                                        fontWeight: 600,
                                        lineHeight: 1,
                                        color: isFirstWin
                                            ? '#0b0b12'
                                            : unplayed
                                              ? 'rgba(255, 255, 255, 0.32)'
                                              : 'rgba(255, 255, 255, 0.88)',
                                        bgcolor: isFirstWin
                                            ? ORANGE
                                            : unplayed
                                              ? 'transparent'
                                              : 'rgba(255, 255, 255, 0.11)',
                                        boxShadow: unplayed
                                            ? `inset 0 0 0 1px ${HAIRLINE}`
                                            : 'none',
                                        backgroundImage: unplayed
                                            ? 'linear-gradient(135deg, transparent 46%, rgba(255, 255, 255, 0.24) 47%, rgba(255, 255, 255, 0.24) 53%, transparent 54%)'
                                            : 'none',
                                        transition: `background-color 260ms ${EASE_OUT}, color 260ms ${EASE_OUT}`,
                                    }}
                                >
                                    {game}
                                </Box>
                            );
                        })}
                    </Stack>
                    {dates && (
                        <Typography variant='caption' sx={dateSx}>
                            {shortDate(GAME_DATES[block[0] - 1])}
                        </Typography>
                    )}
                </Box>
            ))}
            <Box sx={{ flex: '0 0 auto' }}>
                <Condensed
                    sx={{
                        height: cellHeight,
                        px: 0.75,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '3px',
                        fontSize,
                        letterSpacing: '0.04em',
                        color: draft.tiebreaks ? '#0b0b12' : 'rgba(255, 255, 255, 0.5)',
                        bgcolor: draft.tiebreaks ? ORANGE : 'transparent',
                        boxShadow: draft.tiebreaks ? 'none' : `inset 0 0 0 1px ${HAIRLINE}`,
                        transition: `background-color 260ms ${EASE_OUT}, color 260ms ${EASE_OUT}`,
                    }}
                >
                    {THE_MATCH.tiebreakCell}
                </Condensed>
                {dates && (
                    <Typography
                        variant='caption'
                        sx={{ ...dateSx, display: { xs: 'none', sm: 'block' } }}
                    >
                        {shortDate(TIEBREAK_DATE)}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

/** The strip with the visitor's picks spelled out underneath. */
export function MatchStripWithSummary({ draft }: { draft: Draft }) {
    return (
        <Box>
            <MatchStrip draft={draft} size='small' />
            <Typography
                variant='body2'
                aria-hidden
                sx={{ mt: 1, minHeight: '1.45em', color: MUTED, fontSize: '0.92rem' }}
            >
                {matchSummary(draft).join(' ')}
            </Typography>
        </Box>
    );
}
