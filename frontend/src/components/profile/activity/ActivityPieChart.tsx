import { useRequirements } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { RequirementCategory } from '@/database/requirement';
import { ALL_COHORTS, compareCohorts, User } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon, { type IconName } from '@/style/Icon';
import { Box, Button, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { displayTimeframe, getScoreChartData, getTimeChartData, Timeframe } from './activity';
import PieChart, { PieChartData } from './PieChart';
import { UseTimelineResponse } from './useTimeline';

/**
 * Maps activity pie chart category labels to icon names for tooltip display.
 *
 * @param name The displayed activity category name.
 * @returns The matching icon name, if one exists.
 */
const getCategoryIconName = (name: string): IconName | undefined => {
    const iconMap: Record<string, IconName> = {
        'Games + Analysis': RequirementCategory.Games,
        Tactics: RequirementCategory.Tactics,
        'Middlegames + Strategy': RequirementCategory.Middlegames,
        Endgame: RequirementCategory.Endgame,
        Opening: RequirementCategory.Opening,
        'Welcome to the Dojo': RequirementCategory.Welcome,
    };

    return iconMap[name];
};

/**
 * Converts a number of minutes to a display string in the format `1h 23m`.
 * @param value The time to display in minutes.
 * @returns The time as a display string.
 */
function getTimeDisplay(value: number) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${hours}h ${minutes}m`;
}

const LAST_SELECTED_COHORTS_KEY = 'lastSelectedCohorts';

interface ActivityPieChartProps {
    user: User;
    timeline: UseTimelineResponse;
}

const ActivityPieChart: React.FC<ActivityPieChartProps> = ({ user, timeline }) => {
    const [timeframe, setTimeframe] = useState(Timeframe.AllTime);
    const { requirements } = useRequirements(ALL_COHORTS, false);
    const { user: viewer } = useAuth();

    const [scoreChartCategory, setScoreChartCategory] = useState('');
    const [timeChartCategory, setTimeChartCategory] = useState('');

    const [lastSelectedCohorts, setLastSelectedCohorts] = useLocalStorage(
        LAST_SELECTED_COHORTS_KEY,
        [ALL_COHORTS],
    );

    const cohortOptions = useMemo(() => {
        let cohortOptions = [ALL_COHORTS, user.dojoCohort];

        if (user.progress) {
            cohortOptions = [ALL_COHORTS].concat(
                Object.values(user.progress)
                    .map((v) => Object.keys(v.minutesSpent ?? {}))
                    .flat()
                    .concat(user.dojoCohort)
                    .sort(compareCohorts)
                    .filter((item, pos, ary) => !pos || item !== ary[pos - 1]),
            );
        }
        return cohortOptions.map((opt) => ({
            value: opt,
            label: opt === ALL_COHORTS ? 'All Cohorts' : opt,
            icon: (
                <CohortIcon
                    cohort={opt}
                    size={25}
                    sx={{ marginRight: '0.6rem' }}
                    tooltip=''
                    color='primary'
                />
            ),
        }));
    }, [user.progress, user.dojoCohort]);

    const [cohorts, setCohorts] = useState(
        viewer?.username === user.username &&
            lastSelectedCohorts.every((c) => cohortOptions.some((opt) => opt.value === c))
            ? lastSelectedCohorts
            : [ALL_COHORTS],
    );

    const scoreChartData = useMemo(() => {
        return getScoreChartData(
            user,
            cohorts,
            timeframe,
            timeline.entries,
            scoreChartCategory,
            requirements,
        );
    }, [user, cohorts, timeframe, timeline.entries, scoreChartCategory, requirements]);

    const timeChartData = useMemo(() => {
        return getTimeChartData(
            user,
            cohorts,
            timeframe,
            timeline.entries,
            timeChartCategory,
            requirements,
        );
    }, [user, cohorts, timeframe, timeline.entries, timeChartCategory, requirements]);

    /**
     * Returns tooltip content for a hovered time chart slice.
     *
     * On the top-level chart, this includes the parent category time and its
     * subcategory breakdown. On a drilled-in chart, it shows only the hovered
     * subcategory values.
     *
     * @param entry The hovered pie chart entry.
     * @returns The tooltip content for that entry.
     */
    const getTimeChartTooltip = (entry?: PieChartData) => {
        if (!entry) {
            return '';
        }

        if (timeChartCategory) {
            return (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <Icon name={getCategoryIconName(entry.name)} fontSize='small' />
                        <Box>{entry.name}</Box>
                    </Box>
                    <Box sx={{ fontWeight: 700 }}>{getTimeDisplay(entry.value)}</Box>
                </Box>
            );
        }

        const breakdown = [
            ...getTimeChartData(
                user,
                cohorts,
                timeframe,
                timeline.entries,
                entry.name,
                requirements,
            ),
        ].sort((a, b) => b.value - a.value);

        return (
            <Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 0.75,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Icon name={getCategoryIconName(entry.name)} fontSize='small' />
                        <Box sx={{ fontSize: '1rem', fontWeight: 700 }}>{entry.name}</Box>
                    </Box>

                    <Box sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        {getTimeDisplay(entry.value)}
                    </Box>
                </Box>

                {breakdown.map((item) => (
                    <Box key={item.name} sx={{ pl: 1, mb: 0.25 }}>
                        <Box component='span' sx={{ fontWeight: 700 }}>
                            {item.name}
                        </Box>{' '}
                        - {getTimeDisplay(item.value)}
                    </Box>
                ))}

                {!!breakdown.length && (
                    <Box sx={{ mt: 0.75, fontSize: '0.75rem', opacity: 0.8 }}>
                        Click for more details
                    </Box>
                )}
            </Box>
        );
    };

    /**
     * Returns tooltip content for a hovered score chart slice.
     *
     * On the top-level chart, this includes the parent category score and its
     * subcategory breakdown. On a drilled-in chart, it shows only the hovered
     * subcategory values.
     *
     * @param entry The hovered pie chart entry.
     * @returns The tooltip content for that entry.
     */
    const getScoreChartTooltip = (entry?: PieChartData) => {
        if (!entry) {
            return '';
        }

        const score = Math.round(entry.value * 100) / 100;

        if (scoreChartCategory) {
            return (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <Icon name={getCategoryIconName(entry.name)} fontSize='small' />
                        <Box>{entry.name}</Box>
                    </Box>
                    <Box>{entry.count ? `Count: ${entry.count}, Score: ${score}` : score}</Box>
                </Box>
            );
        }

        const breakdown = [
            ...getScoreChartData(
                user,
                cohorts,
                timeframe,
                timeline.entries,
                entry.name,
                requirements,
            ),
        ].sort((a, b) => b.value - a.value);

        return (
            <Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 0.75,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Icon name={getCategoryIconName(entry.name)} fontSize='small' />
                        <Box sx={{ fontSize: '1rem', fontWeight: 700 }}>{entry.name}</Box>
                    </Box>

                    <Box sx={{ fontSize: '1rem', fontWeight: 700 }}>
                        {entry.count ? `Count: ${entry.count}, Score: ${score}` : score}
                    </Box>
                </Box>

                {breakdown.map((item) => {
                    const childScore = Math.round(item.value * 100) / 100;

                    return (
                        <Box key={item.name} sx={{ pl: 1, mb: 0.25 }}>
                            <Box component='span' sx={{ fontWeight: 700 }}>
                                {item.name}
                            </Box>{' '}
                            -{' '}
                            {item.count ? `Count: ${item.count}, Score: ${childScore}` : childScore}
                        </Box>
                    );
                })}

                {!!breakdown.length && (
                    <Box sx={{ mt: 0.75, fontSize: '0.75rem', opacity: 0.8 }}>
                        Click for more details
                    </Box>
                )}
            </Box>
        );
    };

    const onChangeCohort = (newCohorts: string[]) => {
        setScoreChartCategory('');
        setTimeChartCategory('');

        const addedCohorts = newCohorts.filter((c) => !cohorts.includes(c));
        let finalCohorts = [];
        if (addedCohorts.includes(ALL_COHORTS)) {
            finalCohorts = [ALL_COHORTS];
        } else {
            finalCohorts = newCohorts.filter((c) => c !== ALL_COHORTS);
        }

        if (viewer?.username === user.username) {
            setLastSelectedCohorts(finalCohorts);
        }

        setCohorts(finalCohorts);
    };

    const onChangeTimeframe = (timeframe: Timeframe) => {
        setScoreChartCategory('');
        setTimeChartCategory('');
        setTimeframe(timeframe);
    };

    const onClickScoreChart = (_: React.MouseEvent, segmentIndex: number) => {
        if (!scoreChartCategory) {
            setScoreChartCategory(scoreChartData[segmentIndex].name);
        }
    };

    const onClickTimeChart = (_: React.MouseEvent, segmentIndex: number) => {
        if (!timeChartCategory) {
            setTimeChartCategory(timeChartData[segmentIndex].name);
        }
    };

    return (
        <Grid container columnSpacing={1} justifyContent='center'>
            <Grid size={{ xs: 12, sm: 6 }}>
                <MultipleSelectChip
                    selected={cohorts}
                    setSelected={onChangeCohort}
                    options={cohortOptions}
                    label='Cohorts'
                    sx={{ mb: 3, width: 1 }}
                    size='small'
                    error={cohorts.length === 0}
                />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                    select
                    label='Timeframe'
                    value={timeframe}
                    onChange={(event) => onChangeTimeframe(event.target.value as Timeframe)}
                    sx={{ mb: 3, height: 1 }}
                    fullWidth
                >
                    {Object.values(Timeframe).map((option) => (
                        <MenuItem key={option} value={option}>
                            {displayTimeframe(option)}
                        </MenuItem>
                    ))}
                </TextField>
            </Grid>

            <Grid size={12}>
                <Typography variant='body2' color='text.secondary' textAlign='center'>
                    Click on a segment of the pie chart to see more details
                </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }} mt={4}>
                <PieChart
                    id='score-chart'
                    title={`Score Breakdown${scoreChartCategory && `: ${scoreChartCategory}`}`}
                    data={scoreChartData}
                    renderTotal={(score) => (
                        <Stack alignItems='center'>
                            <Typography variant='subtitle1'>
                                Total {scoreChartCategory ? 'Category' : 'Cohort'} Score:{' '}
                                {Math.round(score * 100) / 100}
                            </Typography>
                            {scoreChartCategory && (
                                <Button onClick={() => setScoreChartCategory('')}>
                                    Back to Cohort
                                </Button>
                            )}
                        </Stack>
                    )}
                    getTooltip={getScoreChartTooltip}
                    onClick={onClickScoreChart}
                />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }} mt={4}>
                <PieChart
                    id='time-chart'
                    title={`Time Breakdown${timeChartCategory && `: ${timeChartCategory}`}`}
                    data={timeChartData}
                    renderTotal={(time) => (
                        <Stack alignItems='center'>
                            <Typography variant='subtitle1'>
                                Total {timeChartCategory ? 'Category' : 'Cohort'} Time:{' '}
                                {getTimeDisplay(time)}
                            </Typography>
                            {timeChartCategory && (
                                <Button onClick={() => setTimeChartCategory('')}>
                                    Back to Cohort
                                </Button>
                            )}
                        </Stack>
                    )}
                    getTooltip={getTimeChartTooltip}
                    onClick={onClickTimeChart}
                />
            </Grid>
        </Grid>
    );
};

export default ActivityPieChart;
