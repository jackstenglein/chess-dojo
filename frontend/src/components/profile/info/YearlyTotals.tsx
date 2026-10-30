import { listUserTimeline } from '@/api/userApi';
import { useAuth } from '@/auth/Auth';
import { formatTime, RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CategoryColors } from '@/style/ThemeProvider';
import {
    Box,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { TrainingPlanIcon } from '../trainingPlan/TrainingPlanIcon';
import { getEntryDay } from './Heatmap';

/** The categories that can hold time, in the order the training plan shows them. */
const CATEGORIES = [
    RequirementCategory.Welcome,
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
    RequirementCategory.NonDojo,
];

interface YearTotal {
    year: string;
    total: number;
    byCategory: Partial<Record<RequirementCategory, number>>;
}

/**
 * Loads a user's whole timeline. The profile only loads the last year, so the
 * yearly totals fetch the rest themselves, when they're shown.
 */
function useFullTimeline(owner: string) {
    const [entries, setEntries] = useState<TimelineEntry[]>();
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const all: TimelineEntry[] = [];
                let startKey: string | undefined;
                do {
                    const response = await listUserTimeline(owner, startKey);
                    all.push(...response.entries);
                    startKey = response.lastEvaluatedKey;
                } while (startKey && !cancelled);
                if (!cancelled) {
                    setEntries(all);
                }
            } catch {
                if (!cancelled) {
                    setError(true);
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [owner]);

    return { entries, error };
}

/**
 * Time logged per calendar year, overall and by category, newest year first. Days
 * are counted as the heatmap counts them, and time removed by corrections is left
 * out, as there.
 */
export function YearlyTotals({ owner }: { owner: string }) {
    const t = useTranslations('profile.info.heatmap');
    const tCommon = useTranslations('common');
    const tCategory = useTranslations('enums.requirementCategory');
    const { user: viewer } = useAuth();
    const { entries, error } = useFullTimeline(owner);

    const years = useMemo(() => {
        if (!entries) {
            return [];
        }
        const byYear = new Map<string, YearTotal>();
        for (const entry of entries) {
            if (entry.minutesSpent <= 0 || !CATEGORIES.includes(entry.requirementCategory)) {
                continue;
            }
            const year = getEntryDay(entry, viewer).slice(0, 4);
            const total = byYear.get(year) ?? { year, total: 0, byCategory: {} };
            total.total += entry.minutesSpent;
            total.byCategory[entry.requirementCategory] =
                (total.byCategory[entry.requirementCategory] ?? 0) + entry.minutesSpent;
            byYear.set(year, total);
        }
        return [...byYear.values()].sort((a, b) => b.year.localeCompare(a.year));
    }, [entries, viewer]);

    // Only categories with time in some year get a column.
    const categories = CATEGORIES.filter((c) => years.some((y) => y.byCategory[c]));
    const categoryName = (c: RequirementCategory) => (tCategory.has(c) ? tCategory(c) : c);

    return (
        <Stack spacing={1.5} sx={{ width: 1, maxWidth: 1000 }} data-testid='heatmap-yearly-totals'>
            <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{t('yearlyTotals')}</Typography>

            {!entries && !error && (
                <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {t('loadingHistory')}
                    </Typography>
                </Stack>
            )}
            {error && (
                <Typography variant='body2' sx={{ color: 'error.main' }}>
                    {t('historyError')}
                </Typography>
            )}
            {entries && years.length === 0 && (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t('noTimeLogged')}
                </Typography>
            )}

            {years.length > 0 && (
                <TableContainer>
                    <Table size='small' sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('year')}</TableCell>
                                <TableCell>{t('total')}</TableCell>
                                <TableCell sx={{ width: 180 }} />
                                {categories.map((c) => (
                                    <TableCell key={c} align='right'>
                                        <Tooltip title={categoryName(c)}>
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',
                                                    gap: 0.5,
                                                }}
                                            >
                                                <TrainingPlanIcon
                                                    category={c}
                                                    sx={{
                                                        fontSize: '1rem',
                                                        color: CategoryColors[c],
                                                    }}
                                                />
                                                <Box component='span'>{categoryName(c)}</Box>
                                            </Stack>
                                        </Tooltip>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {years.map((y) => (
                                <TableRow key={y.year}>
                                    <TableCell sx={{ fontWeight: 600 }}>{y.year}</TableCell>
                                    <TableCell
                                        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                                    >
                                        {formatTime(y.total, tCommon)}
                                    </TableCell>
                                    <TableCell>
                                        <CategorySplit total={y} categories={categories} />
                                    </TableCell>
                                    {categories.map((c) => (
                                        <TableCell
                                            key={c}
                                            align='right'
                                            sx={{
                                                fontVariantNumeric: 'tabular-nums',
                                                color: y.byCategory[c]
                                                    ? 'text.primary'
                                                    : 'text.disabled',
                                            }}
                                        >
                                            {y.byCategory[c]
                                                ? formatTime(y.byCategory[c], tCommon)
                                                : '–'}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Stack>
    );
}

/** A year's time as one bar split into its categories' colors. */
function CategorySplit({
    total,
    categories,
}: {
    total: YearTotal;
    categories: RequirementCategory[];
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                height: 8,
                width: 1,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: 'action.hover',
            }}
        >
            {categories.map((c) =>
                total.byCategory[c] ? (
                    <Box
                        key={c}
                        sx={{
                            width: `${(100 * (total.byCategory[c] ?? 0)) / total.total}%`,
                            backgroundColor: CategoryColors[c],
                        }}
                    />
                ) : null,
            )}
        </Box>
    );
}
