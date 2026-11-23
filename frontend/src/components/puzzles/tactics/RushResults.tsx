import { Close, LocalFireDepartment } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

/** How one puzzle of the session went. */
export interface PuzzleResult {
    id: string;
    /** The puzzle's rating, shown under its mark, if it has one. */
    rating?: number;
    /** Whether it was solved with no mistake and no move shown. */
    ok: boolean;
}

/** How many puzzles in a row, counting back from the latest, were solved cleanly. */
export function currentStreak(results: PuzzleResult[]): number {
    let run = 0;
    for (let i = results.length - 1; i >= 0 && results[i].ok; i--) run++;
    return run;
}

/** One mark: a small square, with the puzzle's rating under it. */
function Mark({ result, streaking }: { result: PuzzleResult; streaking?: boolean }) {
    return (
        <Stack
            aria-label={`${result.ok ? 'Solved' : 'Missed'}${result.rating !== undefined ? ` ${result.rating}` : ''}`}
            sx={{ alignItems: 'center', width: 32 }}
        >
            <Box
                sx={{
                    width: 18,
                    height: 18,
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: result.ok ? 'success.main' : 'error.main',
                    color: '#fff',
                    // The squares of a streak glow a little, as if they were catching fire.
                    boxShadow: streaking
                        ? (theme) => `0 0 6px ${theme.palette.warning.main}`
                        : undefined,
                }}
            >
                {!result.ok && <Close sx={{ fontSize: 14 }} />}
            </Box>
            {result.rating !== undefined && (
                <Typography
                    sx={{
                        fontSize: '0.68rem',
                        lineHeight: 1.5,
                        fontVariantNumeric: 'tabular-nums',
                        color: result.ok ? 'text.secondary' : 'error.main',
                    }}
                >
                    {result.rating}
                </Typography>
            )}
        </Stack>
    );
}

/**
 * The session so far as a row of small marks, like a puzzle rush: a green square for each puzzle
 * solved cleanly and a red cross for each that was not, with the puzzle's rating under it. The run
 * of clean solves at the end, the streak, sits in a warm band of its own, so a long streak looks
 * like one.
 */
export function RushResults({ results }: { results: PuzzleResult[] }) {
    if (results.length === 0) return null;

    const run = currentStreak(results);
    // A streak of one is just a solve. From two it gets the band.
    const streak = run >= 2 ? results.slice(results.length - run) : [];
    const before = results.slice(0, results.length - streak.length);

    return (
        <Box
            aria-label='Puzzles this session'
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                columnGap: 0.5,
                rowGap: 1,
                maxHeight: 230,
                overflowY: 'auto',
            }}
        >
            {before.map((result, i) => (
                <Mark key={`${result.id}-${i}`} result={result} />
            ))}
            {streak.length > 0 && (
                <Stack
                    direction='row'
                    aria-label={`${streak.length} in a row`}
                    sx={{
                        flexWrap: 'wrap',
                        columnGap: 0.25,
                        px: 0.5,
                        borderRadius: 1,
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.14),
                        borderBottom: 2,
                        borderColor: 'warning.main',
                    }}
                >
                    {streak.map((result, i) => (
                        <Mark key={`${result.id}-${i}`} result={result} streaking />
                    ))}
                </Stack>
            )}
        </Box>
    );
}

/**
 * The run of the session so far, for the left card: how many puzzles are right, the streak with a
 * flame from two in a row, and the row of marks.
 */
export function SessionStreak({
    results,
    streak,
    showCount = true,
}: {
    results: PuzzleResult[];
    streak: number;
    /** Whether to show how many are correct. Left out where the count is shown elsewhere. */
    showCount?: boolean;
}) {
    return (
        <Stack sx={{ gap: 1.5 }}>
            {(showCount || streak >= 2) && (
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                >
                    {showCount ? (
                        <Stack direction='row' sx={{ alignItems: 'baseline', gap: 0.75 }}>
                            <Typography
                                sx={{
                                    fontSize: '2rem',
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    color: 'success.main',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {results.filter((result) => result.ok).length}
                            </Typography>
                            <Typography color='text.secondary'>correct</Typography>
                        </Stack>
                    ) : (
                        <span />
                    )}
                    {streak >= 2 && (
                        <Stack
                            direction='row'
                            sx={{ alignItems: 'center', gap: 0.5, color: 'warning.main' }}
                        >
                            <LocalFireDepartment />
                            <Typography sx={{ fontWeight: 800 }}>{streak} in a row!</Typography>
                        </Stack>
                    )}
                </Stack>
            )}
            <RushResults results={results} />
        </Stack>
    );
}
