import { useApi } from '@/api/Api';
import { useEvents } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import {
    AvailabilityType,
    CalendarSessionType,
    Event,
    EventStatus,
    PositionType,
    TimeControlType,
    TournamentType,
    displayTimeControlType,
    getDisplaySessionString,
    getDisplayString,
} from '@/database/event';
import { ALL_COHORTS, TimeFormat, compareCohorts, dojoCohorts } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import { DayHours } from '@jackstenglein/react-scheduler/types';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { Button, Stack, SvgIconOwnProps, Typography, useMediaQuery } from '@mui/material';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary';
import { Theme, styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import TimezoneFilter from './TimezoneFilter';
import { DefaultTimezone } from './TimezoneSelector';

export type WeekDays = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion disableGutters elevation={0} square {...props} />
))(() => ({
    '&:before': {
        display: 'none',
    },
}));

export const AccordionSummary = styled(
    ({ forceExpansion, ...props }: AccordionSummaryProps & { forceExpansion: boolean }) => (
        <MuiAccordionSummary
            expandIcon={!forceExpansion && <ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
            {...props}
        />
    ),
)(({ theme }) => ({
    paddingLeft: 0,
    border: 0,
    minHeight: 0,
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
        transform: 'rotate(90deg)',
    },
    '& .MuiAccordionSummary-content': {
        marginLeft: theme.spacing(1),
        marginTop: 0,
        marginBottom: 0,
    },
}));

export const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    borderTop: '1px solid rgba(0, 0, 0, .125)',
    padding: 0,
    paddingLeft: theme.spacing(1),
}));

export interface Filters {
    timezone: string;
    setTimezone: React.Dispatch<React.SetStateAction<string>>;

    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;

    weekStartOn: WeekDays;
    setWeekStartOn: (v: WeekDays) => void;

    minHour: DateTime | null;
    setMinHour: (d: DateTime | null) => void;

    maxHour: DateTime | null;
    setMaxHour: (d: DateTime | null) => void;

    sessions: CalendarSessionType[];
    setSessions: (v: CalendarSessionType[]) => void;

    types: AvailabilityType[];
    setTypes: (v: AvailabilityType[]) => void;

    cohorts: string[];
    setCohorts: (v: string[]) => void;

    tournamentTypes: TournamentType[];
    setTournamentTypes: (v: TournamentType[]) => void;

    tournamentTimeControls: TimeControlType[];
    setTournamentTimeControls: (v: TimeControlType[]) => void;

    tournamentPositions: PositionType[];
    setTournamentPositions: (v: PositionType[]) => void;
}

export function useFilters(): Filters {
    const { user, updateUser } = useAuth();
    const api = useApi();

    const [timezone, setTimezone] = useState(user?.timezoneOverride || DefaultTimezone);
    useEffect(() => {
        if (user?.timezoneOverride) {
            setTimezone(user.timezoneOverride);
        }
    }, [user?.timezoneOverride, setTimezone]);

    const [timeFormat, setTimeFormat] = useState<TimeFormat>(
        user?.timeFormat || TimeFormat.TwelveHour,
    );
    const [originalWeekStartOn] = useLocalStorage<WeekDays>('calendarFilters.weekStartOn', 0);
    const [minHour, setMinHour] = useLocalStorage<DateTime | null>(
        'calendarFilters.minHour',
        DateTime.now().set({ hour: 0 }),
        { deserializer: (v) => DateTime.fromISO(JSON.parse(v) as string) },
    );
    const [maxHour, setMaxHour] = useLocalStorage<DateTime | null>(
        'calendarFilters.maxHour',
        DateTime.now().set({ hour: 23 }),
        { deserializer: (v) => DateTime.fromISO(JSON.parse(v) as string) },
    );

    const [sessions, setSessions] = useLocalStorage('calendarFilters.sessions', [
        CalendarSessionType.AllSessions,
    ]);

    const [types, setTypes] = useLocalStorage('calendarFilters.types.2', [
        AvailabilityType.AllTypes,
    ]);

    const [cohorts, setCohorts] = useLocalStorage('calendarFilters.cohorts.2', [ALL_COHORTS]);

    const [tournamentTypes, setTournamentTypes] = useLocalStorage(
        'calendarFilters.tournamentTypes.2',
        [TournamentType.AllTournamentTypes],
    );

    const [tournamentTimeControls, setTournamentTimeControls] = useLocalStorage(
        'calendarFilters.tournamentTimeControls.2',
        [TimeControlType.AllTimeContols],
    );

    const [tournamentPositions, setTournamentPositions] = useLocalStorage(
        'calendarFilters.tournamentPositions.2',
        [PositionType.AllPositions],
    );

    const { searchParams, setSearchParams } = useNextSearchParams();
    useEffect(() => {
        if (searchParams.get('sessions')) {
            setSessions(JSON.parse(searchParams.get('sessions') || '[]') as CalendarSessionType[]);
        }
        if (searchParams.get('types')) {
            setTypes(JSON.parse(searchParams.get('types') || '[]') as AvailabilityType[]);
        }
        if (searchParams.get('tournamentTimeControls')) {
            setTournamentTimeControls(
                JSON.parse(searchParams.get('tournaments') || '[]') as TimeControlType[],
            );
        }

        setSearchParams({});
    }, [searchParams, setSearchParams, setSessions, setTypes, setTournamentTimeControls]);

    const weekStartOn = user?.weekStart ?? originalWeekStartOn;

    const setWeekStartOn = useCallback(
        (weekStart: WeekDays) => {
            updateUser({ weekStart });
            void api.updateUser({ weekStart });
        },
        [api, updateUser],
    );

    const result = useMemo(
        () => ({
            timezone,
            setTimezone,
            timeFormat,
            setTimeFormat,
            weekStartOn,
            setWeekStartOn,
            minHour,
            setMinHour,
            maxHour,
            setMaxHour,
            sessions,
            setSessions,
            types,
            setTypes,
            cohorts,
            setCohorts,
            tournamentTypes,
            setTournamentTypes,
            tournamentTimeControls,
            setTournamentTimeControls,
            tournamentPositions,
            setTournamentPositions,
        }),
        [
            timezone,
            setTimezone,
            timeFormat,
            setTimeFormat,
            weekStartOn,
            setWeekStartOn,
            minHour,
            setMinHour,
            maxHour,
            setMaxHour,
            sessions,
            setSessions,
            types,
            setTypes,
            cohorts,
            setCohorts,
            tournamentTypes,
            setTournamentTypes,
            tournamentTimeControls,
            setTournamentTimeControls,
            tournamentPositions,
            setTournamentPositions,
        ],
    );

    return result;
}

/**
 * Returns the hours of the given minimum and maximum dates. If the dates are out of range,
 * the hours will be set to their default values.
 * @param minDate The minimum date.
 * @param maxDate The maximum date.
 * @returns The hours of the minimum and maximum dates.
 */
export function getHours(minDate: DateTime | null, maxDate: DateTime | null): [DayHours, DayHours] {
    let minHour = minDate?.hour || 0;
    let maxHour = (maxDate?.hour || 23) + 1;

    if (minHour < 0 || minHour > 23) {
        minHour = 0;
    }
    if (maxHour < 0 || maxHour > 24) {
        maxHour = 24;
    }
    if (minHour >= maxHour) {
        minHour = 0;
        maxHour = 24;
    }
    return [minHour as DayHours, maxHour as DayHours];
}

function getSessionTypeColor(sessionType: CalendarSessionType): SvgIconOwnProps['color'] {
    switch (sessionType) {
        case CalendarSessionType.AllSessions:
            return 'primary';
        case CalendarSessionType.Availabilities:
            return 'info';
        case CalendarSessionType.CoachingSessions:
            return 'coaching';
        case CalendarSessionType.DojoEvents:
            return 'dojoOrange';
        case CalendarSessionType.Meetings:
            return 'meet';
        case CalendarSessionType.Lectures:
            return 'sage';
        case CalendarSessionType.GameReviews:
            return 'info';
    }
    return 'primary';
}

interface CalendarFiltersProps {
    filters: Filters;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({ filters }) => {
    const auth = useAuth();
    const [expanded, setExpanded] = useState<string | boolean>(false);
    const forceExpansion = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

    const { events } = useEvents();
    const filterTime = new Date(new Date().getTime()).toISOString();
    const meetingCount = events.filter((e: Event) => {
        if (Object.values(e.participants).length === 0) {
            return false;
        }
        if (e.owner !== auth.user?.username && !e.participants[auth.user?.username || '']) {
            return false;
        }
        return e.status !== EventStatus.Canceled && e.endTime >= filterTime;
    }).length;

    const handleChange =
        (panel: string) => (_event: React.SyntheticEvent, newExpanded: boolean) => {
            if (!forceExpansion) {
                setExpanded(newExpanded ? panel : false);
            }
        };

    const onChangeType = (newTypes: string[]) => {
        const addedTypes = newTypes.filter((t) => !filters.types.includes(t as AvailabilityType));
        let finalTypes = [];
        if (addedTypes.includes(AvailabilityType.AllTypes)) {
            finalTypes = [AvailabilityType.AllTypes];
        } else {
            finalTypes = newTypes.filter((t) => t !== AvailabilityType.AllTypes);
        }

        filters.setTypes(finalTypes as AvailabilityType[]);
    };

    const onChangeCohort = (newCohorts: string[]) => {
        const addedCohorts = newCohorts.filter((c) => !filters.cohorts.includes(c));
        let finalCohorts = [];
        if (addedCohorts.includes(ALL_COHORTS)) {
            finalCohorts = [ALL_COHORTS];
        } else {
            finalCohorts = newCohorts.filter((c) => c !== ALL_COHORTS).sort(compareCohorts);
        }

        filters.setCohorts(finalCohorts);
    };

    const onChangeTournamentTimeControls = (tcTypes: string[]) => {
        const addedTcTypes = tcTypes.filter(
            (tc) => !filters.tournamentTimeControls.includes(tc as TimeControlType),
        );

        let finalTcTypes = [];
        if (addedTcTypes.includes(TimeControlType.AllTimeContols)) {
            finalTcTypes = [TimeControlType.AllTimeContols];
        } else {
            finalTcTypes = tcTypes.filter((tc) => tc !== TimeControlType.AllTimeContols);
        }

        filters.setTournamentTimeControls(finalTcTypes as TimeControlType[]);
    };

    const onChangeSessions = (sessionTypes: string[]) => {
        const addedSessions = sessionTypes.filter(
            (s) => !filters.sessions.includes(s as CalendarSessionType),
        );

        let finalSessions = [];
        if (addedSessions.includes(CalendarSessionType.AllSessions)) {
            finalSessions = [CalendarSessionType.AllSessions];
        } else {
            finalSessions = sessionTypes.filter((s) => s !== CalendarSessionType.AllSessions);
        }
        filters.setSessions(finalSessions as CalendarSessionType[]);
    };

    const onReset = () => {
        filters.setSessions([CalendarSessionType.AllSessions]);
        filters.setTournamentTimeControls([TimeControlType.AllTimeContols]);
        filters.setTypes([AvailabilityType.AllTypes]);
        filters.setCohorts([ALL_COHORTS]);
    };

    return (
        <Stack data-testid='calendar-filters' spacing={{ xs: 3, sm: 4 }}>
            {meetingCount > 0 && (
                <Link
                    href='/meeting'
                    sx={{
                        alignSelf: 'center',
                        my: 'calc(2 * var(--mui-spacing)) !important',
                    }}
                >
                    View {meetingCount} upcoming meeting{meetingCount !== 1 ? 's' : ''}
                </Link>
            )}

            <Accordion
                expanded={forceExpansion || expanded === 'dojoCalendar'}
                onChange={handleChange('dojoCalendar')}
            >
                {!forceExpansion && (
                    <AccordionSummary
                        aria-controls='dojocalendar-content'
                        forceExpansion={forceExpansion}
                    >
                        <Typography variant='h6' color='text.secondary'>
                            Filters
                        </Typography>
                    </AccordionSummary>
                )}
                <AccordionDetails sx={{ border: 'none' }}>
                    <Stack sx={{ mt: 2, pb: 2 }} spacing={3}>
                        <TimezoneFilter filters={filters} />

                        <Button
                            variant='outlined'
                            onClick={onReset}
                            sx={{ alignSelf: 'start' }}
                            startIcon={<Icon name='reset' />}
                        >
                            Reset Filters
                        </Button>

                        <Stack data-testid='calendar-filters-selectors'>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='eventCheck'
                                    color='primary'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                />
                                My Dojo Calendar
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.sessions}
                                setSelected={onChangeSessions}
                                options={Object.values(CalendarSessionType).map((t) => ({
                                    value: t,
                                    label: getDisplaySessionString(t),
                                    icon: <Icon name={t} color={getSessionTypeColor(t)} />,
                                }))}
                                displayEmpty='None'
                                size='small'
                                data-testid='my-dojo-calendar'
                            />
                        </Stack>

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='liga'
                                    color='liga'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                />
                                DojoLiga Tournaments
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.tournamentTimeControls}
                                setSelected={onChangeTournamentTimeControls}
                                options={Object.values(TimeControlType).map((t) => ({
                                    value: t,
                                    label: displayTimeControlType(t),
                                    icon: <Icon name={t} color='liga' />,
                                }))}
                                displayEmpty='None'
                                size='small'
                                data-testid='dojoliga-tournaments'
                            />
                        </Stack>

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='meet'
                                    color='book'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                />
                                Bookable Meetings
                            </Typography>
                            <MultipleSelectChip
                                selected={filters.types}
                                setSelected={onChangeType}
                                options={Object.values(AvailabilityType).map((t) => ({
                                    value: t,
                                    label: getDisplayString(t),
                                    icon: <Icon name={t} color='book' />,
                                }))}
                                displayEmpty='None'
                                size='small'
                            />
                        </Stack>

                        <Stack>
                            <Typography variant='h6' color='text.secondary'>
                                <Icon
                                    name='cohort'
                                    color='book'
                                    sx={{
                                        marginRight: '0.4rem',
                                        verticalAlign: 'middle',
                                    }}
                                    fontSize='medium'
                                />
                                Cohorts
                            </Typography>
                            <MultipleSelectChip
                                data-testid='cohort-selector'
                                selected={filters.cohorts}
                                setSelected={onChangeCohort}
                                options={[ALL_COHORTS, ...dojoCohorts].map((opt) => ({
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
                                }))}
                                displayEmpty='None'
                                sx={{ mb: 3, width: 1 }}
                                size='small'
                            />
                        </Stack>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
};
