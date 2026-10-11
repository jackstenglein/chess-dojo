import { LeaderboardEntry } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AnnotatorLink } from './AnnotatorLink';

/** A compact leaderboard of who has added the most puzzles. */
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
    const rows = entries.slice(0, 5);
    const max = rows[0]?.puzzleCount ?? 1;

    return (
        <Paper variant='outlined' sx={{ p: 2, minWidth: 260 }}>
            <Typography
                variant='overline'
                sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block', mb: 1 }}
            >
                Top contributors
            </Typography>
            {rows.length === 0 && (
                <Typography variant='body2' color='text.secondary'>
                    No puzzles added yet.
                </Typography>
            )}
            <Stack sx={{ gap: 1.25 }}>
                {rows.map((row, i) => (
                    <Stack
                        key={row.username}
                        direction='row'
                        sx={{ alignItems: 'center', gap: 1.5 }}
                    >
                        <Typography
                            variant='body2'
                            sx={{
                                width: 16,
                                fontWeight: 'bold',
                                color: i === 0 ? 'primary.main' : 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {i + 1}
                        </Typography>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Stack direction='row' sx={{ justifyContent: 'space-between' }}>
                                <Typography variant='body2' noWrap>
                                    <AnnotatorLink
                                        username={row.username}
                                        displayName={row.displayName}
                                    />
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {row.puzzleCount}
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    height: 3,
                                    borderRadius: 1,
                                    mt: 0.5,
                                    width: `${(row.puzzleCount / max) * 100}%`,
                                    bgcolor: (theme) =>
                                        alpha(theme.palette.primary.main, i === 0 ? 0.9 : 0.4),
                                }}
                            />
                        </Box>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
}
