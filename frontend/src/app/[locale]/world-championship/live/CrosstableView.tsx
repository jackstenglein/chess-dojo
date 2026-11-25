'use client';

import { Box, Paper, Tooltip, Typography } from '@mui/material';
import { PlayerPhoto } from './PlayerPhoto';
import { CROSS_PLAYERS, Crosstable, formatPoints, pointsFor } from './crosstable';

interface CrosstableViewProps {
    table?: Crosstable;
    /** The game open on the page, highlighted in the table. */
    currentNumber?: number;
    /** The game being played right now, marked with a dot until it has a result. */
    liveNumber?: number;
    onSelectGame: (number: number) => void;
}

/**
 * The running crosstable: Gukesh on the first row, Sindarov on the second,
 * a column per game with each player's points, and the match score.
 */
export function CrosstableView({
    table,
    currentNumber,
    liveNumber,
    onSelectGame,
}: CrosstableViewProps) {
    if (!table || table.games.length === 0) {
        return null;
    }
    const { games, totals } = table;

    return (
        <Paper
            variant='outlined'
            sx={{ p: 1.5, containerType: 'inline-size' }}
            data-testid='crosstable'
        >
            <Box sx={{ overflowX: 'auto' }}>
                <Box
                    component='table'
                    sx={{
                        // The table fills its box, and the 14 games fit in it without
                        // scrolling. Only a narrow phone has to scroll.
                        width: 1,
                        borderCollapse: 'collapse',
                        fontVariantNumeric: 'tabular-nums',
                        '& th, & td': {
                            border: 1,
                            borderColor: 'divider',
                            textAlign: 'center',
                            px: 0.25,
                            py: 0.5,
                            minWidth: 24,
                        },
                        // The board column drops to about 410px on a small laptop, and a
                        // phone is narrower still, so the cells and the text shrink there.
                        '@container (max-width: 500px)': {
                            fontSize: '0.75rem',
                            '& th, & td': { px: 0, minWidth: 15 },
                            '& th:first-of-type, & td:first-of-type': {
                                pl: 0.5,
                                minWidth: '0 !important',
                            },
                            '& th:last-of-type, & td:last-of-type': { px: 0.25 },
                        },
                    }}
                >
                    <thead>
                        <tr>
                            <Box
                                component='th'
                                sx={{ textAlign: 'left !important', minWidth: '96px !important' }}
                            >
                                <Typography variant='caption' color='text.secondary'>
                                    Game
                                </Typography>
                            </Box>
                            {games.map((g) => (
                                <Box
                                    component='th'
                                    key={g.number}
                                    onClick={() => onSelectGame(g.number)}
                                    sx={{
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        bgcolor:
                                            g.number === currentNumber
                                                ? 'action.selected'
                                                : undefined,
                                    }}
                                >
                                    {g.number}
                                </Box>
                            ))}
                            <Box component='th' sx={{ fontWeight: 800 }}>
                                Score
                            </Box>
                        </tr>
                    </thead>
                    <tbody>
                        {CROSS_PLAYERS.map((p) => (
                            <tr key={p.id}>
                                <Box
                                    component='td'
                                    sx={{ textAlign: 'left !important', fontWeight: 700 }}
                                >
                                    <Box
                                        component='span'
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}
                                    >
                                        <PlayerPhoto name={p.name} size={24} />
                                        {p.name}
                                    </Box>
                                </Box>
                                {games.map((g) => {
                                    const points = pointsFor(g, p.id);
                                    const white = g.white === p.id;
                                    const live = g.result === '*' && g.number === liveNumber;
                                    return (
                                        <Tooltip
                                            key={g.number}
                                            title={`Game ${g.number}: ${p.name} with ${white ? 'White' : 'Black'}`}
                                        >
                                            <Box
                                                component='td'
                                                data-testid={`cross-${p.id}-${g.number}`}
                                                onClick={() => onSelectGame(g.number)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    fontWeight: 800,
                                                    position: 'relative',
                                                    bgcolor:
                                                        g.number === currentNumber
                                                            ? 'action.selected'
                                                            : undefined,
                                                    color:
                                                        points === 1
                                                            ? 'success.main'
                                                            : points === 0
                                                              ? 'error.main'
                                                              : undefined,
                                                    // A corner shows the color the player had.
                                                    '&::after': g.white
                                                        ? {
                                                              content: '""',
                                                              position: 'absolute',
                                                              top: 2,
                                                              right: 2,
                                                              width: 6,
                                                              height: 6,
                                                              borderRadius: '1px',
                                                              border: '1px solid #888',
                                                              bgcolor: white ? '#fff' : '#000',
                                                          }
                                                        : undefined,
                                                }}
                                            >
                                                {points !== undefined
                                                    ? formatPoints(points)
                                                    : live
                                                      ? '•'
                                                      : ''}
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                                <Box component='td' sx={{ fontWeight: 900, fontSize: '1.05rem' }}>
                                    {formatPoints(totals[p.id])}
                                </Box>
                            </tr>
                        ))}
                    </tbody>
                </Box>
            </Box>
            <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mt: 0.75 }}
            >
                Match score {formatPoints(totals.gukesh)}–{formatPoints(totals.sindarov)}. First to
                7½ wins.
            </Typography>
        </Paper>
    );
}
