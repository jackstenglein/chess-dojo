'use client';

import { Box, Paper, Stack, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
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
    // The table shows only once the browser has loaded the match, so the server
    // never renders it. That makes it safe to ask for the screen's real width on
    // the first render.
    const phone = useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
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
            {phone && (
                // A phone shows the match score here, as on a scoreboard. Its table
                // has no room for the photos and the score.
                <Stack
                    direction='row'
                    spacing={1}
                    data-testid='crosstable-score'
                    sx={{ alignItems: 'center', justifyContent: 'center', mb: 1, fontWeight: 700 }}
                >
                    <PlayerPhoto name={CROSS_PLAYERS[0].name} size={28} />
                    <span>{CROSS_PLAYERS[0].name}</span>
                    <Box
                        component='span'
                        sx={{
                            fontWeight: 900,
                            fontSize: '1.35rem',
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {formatPoints(totals[CROSS_PLAYERS[0].id])} :{' '}
                        {formatPoints(totals[CROSS_PLAYERS[1].id])}
                    </Box>
                    <span>{CROSS_PLAYERS[1].name}</span>
                    <PlayerPhoto name={CROSS_PLAYERS[1].name} size={28} />
                </Stack>
            )}
            <Box sx={{ overflowX: 'auto' }}>
                <Box
                    component='table'
                    sx={{
                        // The table fills its box, and the 14 games fit in it without
                        // scrolling.
                        width: 1,
                        borderCollapse: 'collapse',
                        fontVariantNumeric: 'tabular-nums',
                        ...(phone
                            ? {
                                  // On a phone the 14 games share the width evenly, with
                                  // no lines between them.
                                  tableLayout: 'fixed',
                                  fontSize: '0.75rem',
                                  '& th, & td': { textAlign: 'center', px: 0, py: 0.5 },
                                  '& th': { borderBottom: 1, borderColor: 'divider' },
                              }
                            : {
                                  '& th, & td': {
                                      border: 1,
                                      borderColor: 'divider',
                                      textAlign: 'center',
                                      px: 0.25,
                                      py: 0.5,
                                      minWidth: 24,
                                  },
                                  // The board column drops to about 410px on a small laptop,
                                  // so the cells and the text shrink there.
                                  '@container (max-width: 500px)': {
                                      fontSize: '0.75rem',
                                      '& th, & td': { px: 0, minWidth: 15 },
                                      '& th:first-of-type, & td:first-of-type': {
                                          pl: 0.5,
                                          minWidth: '0 !important',
                                      },
                                      '& th:last-of-type, & td:last-of-type': { px: 0.25 },
                                  },
                              }),
                    }}
                >
                    <thead>
                        <tr>
                            <Box
                                component='th'
                                sx={{
                                    textAlign: 'left !important',
                                    ...(phone ? { width: 60 } : { minWidth: '96px !important' }),
                                }}
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
                            {!phone && (
                                <Box component='th' sx={{ fontWeight: 800 }}>
                                    Score
                                </Box>
                            )}
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
                                        {!phone && <PlayerPhoto name={p.name} size={24} />}
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
                                                    // On a phone it sits above the result, in
                                                    // the middle of the narrow cell.
                                                    ...(phone && { pt: '14px !important' }),
                                                    '&::after': g.white
                                                        ? {
                                                              content: '""',
                                                              position: 'absolute',
                                                              top: phone ? 4 : 2,
                                                              right: phone ? 'calc(50% - 4px)' : 2,
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
                                {!phone && (
                                    <Box
                                        component='td'
                                        sx={{ fontWeight: 900, fontSize: '1.05rem' }}
                                    >
                                        {formatPoints(totals[p.id])}
                                    </Box>
                                )}
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
                {!phone &&
                    `Match score ${formatPoints(totals.gukesh)}–${formatPoints(totals.sindarov)}. `}
                First to 7½ wins.
            </Typography>
        </Paper>
    );
}
