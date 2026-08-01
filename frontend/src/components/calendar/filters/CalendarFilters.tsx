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
    getDisplaySessionString,
    getDisplayString,
} from '@/database/event';
import { ALL_COHORTS, TimeFormat, compareCohorts, dojoCohorts } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import { DayHours } from '@jackstenglein/react-scheduler/types';
import { Menu, MenuOpen } from '@mui/icons-material';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { Button, IconButton, Stack, SvgIconOwnProps, Tooltip, Typography } from '@mui/material';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary';
import { styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { FilterToggleGroup } from './FilterToggleGroup';
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
    hidden: boolean;
    setHidden: (v: boolean) => void;

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

const FiltersContext = createContext<Filters | null>(null);

export function FiltersProvider({
    filters,
    children,
}: {
    filters: Filters;
    children: React.ReactNode;
}) {
    return <FiltersContext.Provider value={filters}>{children}</FiltersContext.Provider>;
}

/** Shared filters from the nearest FiltersProvider (e.g. calendar page slots). */
export function useFiltersContext(): Filters {
    const filters = useContext(FiltersContext);
    if (!filters) {
        throw new Error('useFiltersContext must be used within a FiltersProvider');
    }
    return filters;
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

    const [hidden, setHidden] = useLocalStorage('calendarFilters.hidden', false);

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
            hidden,
            setHidden,
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
            hidden,
            setHidden,
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
            return 'book';
        case CalendarSessionType.CoachingSessions:
            return 'coaching';
        case CalendarSessionType.DojoEvents:
            return 'dojoOrange';
        case CalendarSessionType.Meetings:
            return 'meet';
        case CalendarSessionType.Lectures:
            return 'sage';
        case CalendarSessionType.GameReviews:
            return 'peacock';
        default:
            return 'primary';
    }
}

const SESSION_OPTIONS = Object.values(CalendarSessionType).filter(
    (type) =>
        type !== CalendarSessionType.AllSessions && type !== CalendarSessionType.CoachingSessions,
);
const AVAILABILITY_OPTIONS = Object.values(AvailabilityType).filter(
    (type) => type !== AvailabilityType.AllTypes,
);

function areFiltersDefault(filters: Filters): boolean {
    return (
        filters.sessions.length === 1 &&
        filters.sessions[0] === CalendarSessionType.AllSessions &&
        filters.tournamentTimeControls.length === 1 &&
        filters.tournamentTimeControls[0] === TimeControlType.AllTimeContols &&
        filters.types.length === 1 &&
        filters.types[0] === AvailabilityType.AllTypes &&
        filters.cohorts.length === 1 &&
        filters.cohorts[0] === ALL_COHORTS
    );
}

interface CalendarFiltersProps {
    filters: Filters;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({ filters }) => {
    const auth = useAuth();
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');
    const isAllCohorts = filters.cohorts.length === 1 && filters.cohorts[0] === ALL_COHORTS;

    const { events } = useEvents();
    const filterTime = new Date().toISOString();
    const meetingCount = events.filter((e: Event) => {
        if (Object.values(e.participants).length === 0) {
            return false;
        }
        if (e.owner !== auth.user?.username && !e.participants[auth.user?.username || '']) {
            return false;
        }
        return e.status !== EventStatus.Canceled && e.endTime >= filterTime;
    }).length;

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

    const onReset = () => {
        filters.setSessions([CalendarSessionType.AllSessions]);
        filters.setTournamentTimeControls([TimeControlType.AllTimeContols]);
        filters.setTypes([AvailabilityType.AllTypes]);
        filters.setCohorts([ALL_COHORTS]);
    };

    const filtersDefault = areFiltersDefault(filters);
    const cohortSummary = isAllCohorts
        ? ''
        : t('cohortsSelected', { count: filters.cohorts.length });

    if (filters.hidden) {
        return (
            <Tooltip title={t('showFilters')}>
                <IconButton onClick={() => filters.setHidden(false)}>
                    <Menu />
                </IconButton>
            </Tooltip>
        );
    }

    return (
        <Stack data-testid='calendar-filters' spacing={2.5} sx={{ pr: 0.5 }}>
            <Button
                onClick={() => filters.setHidden(true)}
                startIcon={<MenuOpen />}
                size='small'
                sx={{ alignSelf: 'flex-start' }}
            >
                {t('hideFilters')}
            </Button>

            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {!filtersDefault && (
                    <Button
                        size='small'
                        onClick={onReset}
                        startIcon={<Icon name='reset' fontSize='small' />}
                    >
                        {t('resetFilters')}
                    </Button>
                )}
            </Stack>

            {meetingCount > 0 && (
                <Button
                    component={Link}
                    href='/meeting'
                    variant='outlined'
                    size='small'
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                >
                    {t('viewMeetings', { count: meetingCount })}
                </Button>
            )}

            <Stack data-testid='calendar-filters-selectors' spacing={2.5}>
                <FilterToggleGroup
                    title={t('myDojoCalendar')}
                    titleIcon={<Icon name='eventCheck' color='primary' fontSize='small' />}
                    selected={filters.sessions}
                    allValue={CalendarSessionType.AllSessions}
                    onChange={(next) => filters.setSessions(next as CalendarSessionType[])}
                    data-testid='my-dojo-calendar'
                    options={SESSION_OPTIONS.map((type) => ({
                        value: type,
                        label: getDisplaySessionString(type, labelT),
                        color: getSessionTypeColor(type),
                    }))}
                />

                <FilterToggleGroup
                    title={t('bookableMeetings')}
                    titleIcon={<Icon name='meet' color='book' fontSize='small' />}
                    selected={filters.types}
                    allValue={AvailabilityType.AllTypes}
                    onChange={(next) => filters.setTypes(next as AvailabilityType[])}
                    data-testid='bookable-meetings'
                    options={AVAILABILITY_OPTIONS.map((type) => ({
                        value: type,
                        label: getDisplayString(type, labelT),
                        color: 'book',
                    }))}
                />

                <Stack>
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                        }}
                    >
                        <Typography
                            variant='subtitle2'
                            sx={{
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                            }}
                        >
                            <Icon name='cohort' color='book' fontSize='small' />
                            {t('cohorts')}
                            {cohortSummary && (
                                <Typography
                                    component='span'
                                    variant='caption'
                                    sx={{
                                        color: 'text.disabled',
                                    }}
                                >
                                    · {cohortSummary}
                                </Typography>
                            )}
                        </Typography>
                    </Stack>
                    <MultipleSelectChip
                        data-testid='cohort-selector'
                        selected={filters.cohorts}
                        setSelected={onChangeCohort}
                        options={[ALL_COHORTS, ...dojoCohorts].map((opt) => ({
                            value: opt,
                            label: opt === ALL_COHORTS ? t('allCohorts') : opt,
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
                        displayEmpty={t('none')}
                        sx={{ mt: 1, width: 1 }}
                        size='small'
                    />
                </Stack>
            </Stack>
        </Stack>
    );
};
