'use client';

import { useApi } from '@/api/Api';
import { useEvents } from '@/api/cache/Cache';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { getTimeZonedDate } from '@/components/calendar/displayDate';
import { useRecurrenceEditPrompt } from '@/components/calendar/EditRecurrenceDialog';
import EventEditor from '@/components/calendar/eventEditor/EventEditor';
import ProcessedEventViewer from '@/components/calendar/eventViewer/ProcessedEventViewer';
import {
    CalendarFilters,
    Filters,
    FiltersProvider,
    getHours,
    useFilters,
} from '@/components/calendar/filters/CalendarFilters';
import CalendarNavigationExtra from '@/components/calendar/filters/CalendarNavigationExtra';
import { DefaultTimezone } from '@/components/calendar/filters/TimezoneSelector';
import {
    getProcessedRecurrence,
    getSeriesTimes,
    haveTimesChanged,
    isRecurringEvent,
    moveAllOccurrences,
    moveSingleOccurrence,
} from '@/components/calendar/recurrence';
import CalendarTutorial from '@/components/tutorial/CalendarTutorial';
import { getConfig } from '@/config';
import {
    AvailabilityType,
    CalendarSessionType,
    Event,
    EventStatus,
    EventType,
    getEventDurationMs,
    TimeControlType,
} from '@/database/event';
import { ALL_COHORTS, isFree, TimeFormat, User } from '@/database/user';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { Scheduler } from '@jackstenglein/react-scheduler';
import type {
    EditorSlotProps,
    EventRendererProps,
    EventViewerActionsExtraSlotProps,
    EventViewerExtraSlotProps,
    ProcessedEvent,
    SchedulerRef,
} from '@jackstenglein/react-scheduler/types';
import { Check, FilterList, Link } from '@mui/icons-material';
import {
    Box,
    Button,
    Container,
    Grid,
    IconButton,
    Snackbar,
    Stack,
    SwipeableDrawer,
    Theme,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    de as dateFnsDe,
    enUS as dateFnsEnUS,
    es as dateFnsEs,
    fr as dateFnsFr,
    it as dateFnsIt,
    ptBR as dateFnsPtBR,
} from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

const SCHEDULER_LOCALES = {
    en: dateFnsEnUS,
    pseudo: dateFnsEnUS,
    de: dateFnsDe,
    it: dateFnsIt,
    fr: dateFnsFr,
    es: dateFnsEs,
    pt: dateFnsPtBR,
} as const;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function processAvailability(
    user: User | undefined,
    filters: Filters,
    event: Event,
    t: TranslateFn,
    theme: Theme,
): ProcessedEvent | null {
    if (event.status === EventStatus.Canceled) {
        return null;
    }

    // This user's joined meetings
    if (
        user &&
        (event.owner === user.username || event.participants[user.username]) &&
        Object.values(event.participants).length > 0
    ) {
        if (
            filters.sessions[0] !== CalendarSessionType.AllSessions &&
            !filters.sessions.includes(CalendarSessionType.Meetings)
        ) {
            return null;
        }

        const title =
            event.title ||
            (event.maxParticipants === 1
                ? t('meetingTitle')
                : t('groupMeetingTitle', {
                      count: Object.values(event.participants).length,
                      max: event.maxParticipants,
                  }));

        const isOwner = event.owner === user.username;
        const editable =
            isOwner && Object.values(event.participants).length < event.maxParticipants;
        const series = getSeriesTimes(event);

        return {
            event_id: event.id,
            title,
            start: new Date(event.bookedStartTime || series.start),
            end: series.end,
            color: theme.palette.meet.main,
            isOwner,
            editable,
            deletable: false,
            draggable: false,
            event,
        };
    }

    // This user's created availabilities
    if (event.owner === user?.username) {
        if (
            filters.sessions[0] !== CalendarSessionType.AllSessions &&
            !filters.sessions.includes(CalendarSessionType.Availabilities)
        ) {
            return null;
        }

        const title =
            event.title ||
            (event.maxParticipants === 1 ? t('available1on1Title') : t('availableGroupTitle'));
        const series = getSeriesTimes(event);
        return {
            event_id: event.id,
            title: title,
            start: series.start,
            end: series.end,
            color: theme.palette.info.main,
            draggable: true,
            isOwner: true,
            editable: true,
            deletable: true,
            event,
        };
    }

    // Other users' bookable availabilities
    if (!user?.isAdmin && event.status !== EventStatus.Scheduled) {
        return null;
    }

    if (event.inviteOnly && !event.invited?.some((p) => p.username === user?.username)) {
        return null;
    }

    if (
        user &&
        !user.isAdmin &&
        !event.inviteOnly &&
        event.cohorts.every((c) => c !== user.dojoCohort)
    ) {
        return null;
    }

    if (
        filters &&
        filters.types[0] !== AvailabilityType.AllTypes &&
        event.types?.every((t) => !filters.types.includes(t))
    ) {
        return null;
    }

    if (
        filters &&
        filters.cohorts[0] !== ALL_COHORTS &&
        !filters.cohorts.includes(event.ownerCohort)
    ) {
        return null;
    }

    const series = getSeriesTimes(event);
    return {
        event_id: event.id,
        title:
            event.title ||
            (event.maxParticipants > 1
                ? t('bookableGroupTitle', {
                      count: Object.values(event.participants).length,
                      max: event.maxParticipants,
                  })
                : t('bookableTitle', { name: event.ownerDisplayName })),
        start: series.start,
        end: series.end,
        color: theme.palette.book.main,
        editable: false,
        deletable: false,
        draggable: false,
        isOwner: false,
        event,
    };
}

function processDojoEvent(
    user: User | undefined,
    filters: Filters,
    event: Event,
    theme: Theme,
): ProcessedEvent | null {
    if (
        filters.sessions[0] !== CalendarSessionType.AllSessions &&
        !filters.sessions.includes(CalendarSessionType.DojoEvents)
    ) {
        return null;
    }

    if (
        user &&
        !user.isAdmin &&
        !user.isCalendarAdmin &&
        event.cohorts &&
        event.cohorts.length > 0 &&
        event.cohorts.every((c) => c !== user.dojoCohort)
    ) {
        return null;
    }

    const location = event.location.toLowerCase();
    let color = theme.palette.dojoOrange.main;
    if (location.includes('twitch')) {
        color = theme.palette.twitch.main;
    } else if (location.includes('youtube')) {
        color = theme.palette.youtube.main;
    }

    return {
        event_id: event.id,
        title: event.title,
        start: getSeriesTimes(event).start,
        end: getSeriesTimes(event).end,
        color: event.color || color,
        editable: user?.isAdmin || user?.isCalendarAdmin,
        deletable: user?.isAdmin || user?.isCalendarAdmin,
        draggable: user?.isAdmin || user?.isCalendarAdmin,
        isOwner: false,
        event,
        recurring: getProcessedRecurrence(event),
    };
}

function processLigaTournament(
    user: User | undefined,
    filters: Filters,
    event: Event,
    theme: Theme,
): ProcessedEvent | null {
    if (!event.ligaTournament) {
        return null;
    }

    if (
        filters &&
        filters.tournamentTimeControls[0] !== TimeControlType.AllTimeContols &&
        !filters.tournamentTimeControls.includes(event.ligaTournament.timeControlType)
    ) {
        return null;
    }

    return {
        event_id: event.id,
        title: event.title,
        start: getSeriesTimes(event).start,
        end: getSeriesTimes(event).end,
        color: event.color || theme.palette.liga.main,
        editable: user?.isAdmin || user?.isCalendarAdmin,
        deletable: user?.isAdmin || user?.isCalendarAdmin,
        draggable: user?.isAdmin || user?.isCalendarAdmin,
        isOwner: false,
        event,
    };
}

export function processCoachingEvent(
    user: User | undefined,
    filters: Filters,
    event: Event,
    theme: Theme,
): ProcessedEvent | null {
    if (
        filters.sessions[0] !== CalendarSessionType.AllSessions &&
        !filters.sessions.includes(CalendarSessionType.CoachingSessions)
    ) {
        return null;
    }

    const isOwner = event.owner === user?.username;
    if (
        user &&
        !isOwner &&
        !user.isAdmin &&
        !user.isCalendarAdmin &&
        event.cohorts &&
        event.cohorts.length > 0 &&
        event.cohorts.every((c) => c !== user.dojoCohort)
    ) {
        return null;
    }

    const isFreeTier = isFree(user);
    if (!isOwner && isFreeTier && !event.coaching?.bookableByFreeUsers) {
        return null;
    }

    const isParticipant = user && Boolean(event.participants[user.username]);
    if (event.status !== EventStatus.Scheduled && !isOwner && !isParticipant) {
        return null;
    }

    return {
        event_id: event.id,
        title: event.title,
        start: getSeriesTimes(event).start,
        end: getSeriesTimes(event).end,
        color: event.color || theme.palette.coaching.main,
        editable: isOwner,
        deletable: isOwner && Object.values(event.participants).length === 0,
        draggable: isOwner,
        isOwner,
        event,
        recurring: getProcessedRecurrence(event),
    };
}

export function processLiveClassEvent(
    user: User | undefined,
    filters: Filters,
    event: Event,
    theme: Theme,
): ProcessedEvent | null {
    const eventType = event.type as unknown as CalendarSessionType;
    if (
        filters.sessions[0] !== CalendarSessionType.AllSessions &&
        !filters.sessions.includes(eventType)
    ) {
        return null;
    }

    const isOwner = event.owner === user?.username;
    const canMove = isOwner || Boolean(user?.isAdmin || user?.isCalendarAdmin);
    const { start, end } = getSeriesTimes(event);

    return {
        event_id: event.id,
        title: event.title,
        start,
        end,
        color: event.color
            ? event.color
            : event.type === EventType.LectureTier
              ? theme.palette.sage.main
              : theme.palette.peacock.main,
        editable: isOwner,
        deletable: isOwner && Object.values(event.participants).length === 0,
        draggable: canMove,
        isOwner,
        event,
        recurring: getProcessedRecurrence(event),
    };
}

export function getProcessedEvents(
    user: User | undefined,
    filters: Filters,
    events: Event[],
    t: TranslateFn,
    theme: Theme,
): ProcessedEvent[] {
    const result: ProcessedEvent[] = [];

    for (const event of events) {
        let processedEvent: ProcessedEvent | null = null;

        const startHour = getTimeZonedDate(
            getSeriesTimes(event).start,
            filters.timezone,
        ).getHours();
        if (
            startHour < (filters?.minHour?.hour || 0) ||
            startHour > (filters?.maxHour?.hour || 24)
        ) {
            continue;
        }

        if (event.type === EventType.Availability) {
            processedEvent = processAvailability(user, filters, event, t, theme);
        } else if (event.type === EventType.Dojo) {
            processedEvent = processDojoEvent(user, filters, event, theme);
        } else if (event.type === EventType.LigaTournament) {
            processedEvent = processLigaTournament(user, filters, event, theme);
        } else if (event.type === EventType.Coaching) {
            processedEvent = processCoachingEvent(user, filters, event, theme);
        } else if (
            event.type === EventType.LectureTier ||
            event.type === EventType.GameReviewTier
        ) {
            processedEvent = processLiveClassEvent(user, filters, event, theme);
        }

        if (processedEvent !== null) {
            result.push(processedEvent);
        }
    }

    return result;
}

function FreeTierEditor(props: EditorSlotProps) {
    return (
        <UpsellDialog
            open={true}
            onClose={() => props.close()}
            currentAction={RestrictedAction.AddCalendarEvents}
        />
    );
}

function DojoEventEditor(props: EditorSlotProps) {
    return <EventEditor scheduler={props} />;
}

function CalendarEventViewerExtra({ event }: EventViewerExtraSlotProps) {
    return <ProcessedEventViewer processedEvent={event} />;
}

function CalendarEventViewerActionsExtra({
    event: processedEvent,
}: EventViewerActionsExtraSlotProps) {
    const { user } = useAuth();
    const t = useTranslations('calendar');
    const [isCopied, setIsCopied] = useState(false);

    const event = processedEvent.event as Event;
    if (event.type === EventType.Dojo || event.type === EventType.LigaTournament) {
        return null;
    }

    let link = `${getConfig().baseUrl}/meeting/${event.id}`;
    const isParticipant =
        event.owner === user?.username || Boolean(event.participants[user?.username || '']);
    if (
        event.type === EventType.Availability &&
        (Object.values(event.participants).length === 0 || !isParticipant)
    ) {
        link = `${getConfig().baseUrl}/calendar/availability/${event.id}`;
    }

    return (
        <Tooltip title={t('copyLink')}>
            <IconButton
                color='inherit'
                onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                }}
            >
                {isCopied ? <Check /> : <Link />}
            </IconButton>
        </Tooltip>
    );
}

export default function CalendarPage() {
    const theme = useTheme();
    const t = useTranslations('calendar');
    const locale = useLocale();
    const schedulerLocale =
        SCHEDULER_LOCALES[locale as keyof typeof SCHEDULER_LOCALES] ?? dateFnsEnUS;
    const { user } = useAuth();
    const api = useApi();
    const isFreeTier = useFreeTier();
    const [canceled, setCanceled] = useState(false);
    const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

    const { events, putEvent, removeEvent, request } = useEvents();

    const filters = useFilters();

    const calendarRef = useRef<SchedulerRef>(null);

    const copyRequest = useRequest();
    const deleteRequest = useRequest<string>();
    const { prompt: promptRecurrenceEdit, dialog: recurrenceEditDialog } =
        useRecurrenceEditPrompt();

    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const deleteAvailability = useCallback(
        async (id: string) => {
            try {
                // Don't use deleteRequest.onStart as it messes up the
                // scheduler library
                await api.deleteEvent(id);
                removeEvent(id);
                deleteRequest.onSuccess(t('availabilityDeleted'));
                return id;
            } catch (err) {
                deleteRequest.onFailure(err);
            }
        },
        [api, removeEvent, deleteRequest, t],
    );

    const copyAvailability = useCallback(
        async (
            event: React.DragEvent<HTMLButtonElement>,
            _droppedOn: Date,
            newEvent: ProcessedEvent,
            originalEvent: ProcessedEvent,
        ) => {
            try {
                let startIso = newEvent.start.toISOString();
                let endIso = newEvent.end.toISOString();

                if (calendarRef.current?.scheduler.view === 'month') {
                    // In month view, we force the time when dragging to be the same as the
                    // original event because the user can't drag to individual time slots
                    const originalStartIso = originalEvent.start.toISOString();
                    const originalEndIso = originalEvent.end.toISOString();
                    startIso =
                        startIso.substring(0, startIso.indexOf('T')) +
                        originalStartIso.substring(originalStartIso.indexOf('T'));
                    endIso =
                        endIso.substring(0, endIso.indexOf('T')) +
                        originalEndIso.substring(originalEndIso.indexOf('T'));
                }

                const dojoEvent = originalEvent.event as Event | undefined;

                let id = dojoEvent?.id;
                let discordMessageId = dojoEvent?.discordMessageId;
                let privateDiscordEventId = dojoEvent?.privateDiscordEventId;
                let publicDiscordEventId = dojoEvent?.publicDiscordEventId;

                // If shift is held, then set the id and discord ids to
                // undefined in order to create a new event
                if (event.shiftKey) {
                    id = undefined;
                    discordMessageId = undefined;
                    privateDiscordEventId = undefined;
                    publicDiscordEventId = undefined;
                }

                const {
                    startTime: _legacyStart,
                    endTime: _legacyEnd,
                    ...eventWithoutTimes
                } = dojoEvent ?? ({} as Event);

                if (!dojoEvent || dojoEvent.type === EventType.Availability) {
                    copyRequest.onStart();
                    const response = await api.setEvent({
                        ...eventWithoutTimes,
                        rrule: moveAllOccurrences(dojoEvent?.rrule ?? '', new Date(startIso)),
                        durationMs: new Date(endIso).getTime() - new Date(startIso).getTime(),
                        id,
                        discordMessageId,
                        privateDiscordEventId,
                        publicDiscordEventId,
                    });
                    putEvent(response.data);
                    copyRequest.onSuccess();
                    return;
                }
                let durationMs = new Date(endIso).getTime() - new Date(startIso).getTime();
                let rrule = dojoEvent.rrule ?? '';

                const isRecurringEdit =
                    isRecurringEvent(dojoEvent) &&
                    Boolean(id) &&
                    haveTimesChanged(
                        originalEvent.start,
                        originalEvent.end,
                        new Date(startIso),
                        new Date(endIso),
                    );

                if (isRecurringEdit) {
                    const scope = await promptRecurrenceEdit();
                    if (scope === 'cancel') {
                        return;
                    }

                    if (scope === 'this') {
                        durationMs = getEventDurationMs(dojoEvent);
                        rrule = moveSingleOccurrence(
                            dojoEvent,
                            originalEvent.start,
                            new Date(startIso),
                        );
                    } else {
                        rrule = moveAllOccurrences(rrule, new Date(startIso));
                    }
                } else {
                    rrule = moveAllOccurrences(rrule, new Date(startIso));
                }

                copyRequest.onStart();

                const response = await api.setEvent({
                    ...eventWithoutTimes,
                    durationMs,
                    id,
                    discordMessageId,
                    privateDiscordEventId,
                    publicDiscordEventId,
                    rrule,
                });
                putEvent(response.data);
                copyRequest.onSuccess();
            } catch (err) {
                copyRequest.onFailure(err);
            }
        },
        [copyRequest, api, putEvent, promptRecurrenceEdit],
    );

    const processedEvents = useMemo(() => {
        return getProcessedEvents(user, filters, events, t, theme);
    }, [user, filters, events, t, theme]);

    const weekStartOn = filters.weekStartOn;
    const [minHour, maxHour] = getHours(filters.minHour, filters.maxHour);

    return (
        <Container sx={{ py: 3 }} maxWidth={false}>
            <RequestSnackbar request={request} />
            <RequestSnackbar request={deleteRequest} showSuccess />
            <RequestSnackbar request={copyRequest} />
            {recurrenceEditDialog}
            <Snackbar
                open={canceled}
                autoHideDuration={6000}
                onClose={() => setCanceled(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={t('meetingCanceled')}
            />

            <Grid container spacing={2}>
                <Grid
                    size={{ md: filters.hidden ? 'auto' : 2.5, xl: filters.hidden ? 'auto' : 2 }}
                    sx={{ display: { xs: 'none', md: 'block' } }}
                >
                    <Stack
                        spacing={1}
                        sx={{
                            position: 'sticky',
                            top: 'calc(var(--navbar-height) + 16px)',
                            maxHeight: 'calc(100vh - var(--navbar-height) - 32px)',
                            overflow: 'auto',
                            alignSelf: 'flex-start',
                            pb: 2,
                        }}
                    >
                        <Box data-testid='calendar-filters-button'>
                            <CalendarFilters filters={filters} />
                        </Box>
                    </Stack>
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: filters.hidden ? 'grow' : 9.5,
                        xl: filters.hidden ? 'grow' : 10,
                    }}
                >
                    <Stack spacing={2}>
                        {!isMdUp && (
                            <Button
                                onClick={() => setMobileFiltersOpen(true)}
                                startIcon={<FilterList />}
                                variant='outlined'
                                size='small'
                                data-testid='calendar-filters-button'
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {t('filtersTitle')}
                            </Button>
                        )}
                        <FiltersProvider filters={filters}>
                            <Scheduler
                                stickyTop='var(--navbar-height)'
                                ref={calendarRef}
                                locale={schedulerLocale}
                                agenda={false}
                                month={{
                                    weekDays: [0, 1, 2, 3, 4, 5, 6],
                                    weekStartOn: weekStartOn,
                                    startHour: minHour,
                                    endHour: maxHour,
                                    navigation: true,
                                    step: 60,
                                }}
                                week={{
                                    weekDays: [0, 1, 2, 3, 4, 5, 6],
                                    weekStartOn: weekStartOn,
                                    startHour: minHour,
                                    endHour: maxHour,
                                    step: 60,
                                    navigation: true,
                                }}
                                day={{
                                    startHour: minHour,
                                    endHour: maxHour,
                                    step: 60,
                                    navigation: true,
                                }}
                                slots={{
                                    editor: isFreeTier ? FreeTierEditor : DojoEventEditor,
                                    eventViewerActionsExtra: CalendarEventViewerActionsExtra,
                                    eventViewerExtra: CalendarEventViewerExtra,
                                    navigationExtra: CalendarNavigationExtra,
                                }}
                                onDelete={deleteAvailability}
                                onEventDrop={copyAvailability}
                                events={processedEvents}
                                timeZone={
                                    filters.timezone === DefaultTimezone
                                        ? undefined
                                        : filters.timezone
                                }
                                hourFormat={filters.timeFormat || TimeFormat.TwelveHour}
                            />
                        </FiltersProvider>
                    </Stack>
                </Grid>
            </Grid>

            <SwipeableDrawer
                anchor='bottom'
                open={!isMdUp && mobileFiltersOpen}
                onOpen={() => setMobileFiltersOpen(true)}
                onClose={() => setMobileFiltersOpen(false)}
                disableDiscovery
                slotProps={{
                    paper: {
                        sx: {
                            maxHeight: '85vh',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 4,
                        bgcolor: 'divider',
                        borderRadius: 2,
                        alignSelf: 'center',
                        mx: 'auto',
                        mt: 1.5,
                        mb: 1,
                    }}
                />
                <Box sx={{ px: 2, pb: 3, overflow: 'auto' }}>
                    <CalendarFilters filters={filters} />
                </Box>
            </SwipeableDrawer>

            <CalendarTutorial />
        </Container>
    );
}

interface CustomEventRendererProps extends EventRendererProps {
    timeFormat: TimeFormat | undefined;
}

export function CustomEventRenderer({ event, timeFormat, ...props }: CustomEventRendererProps) {
    const textColor = event.color?.endsWith('.main')
        ? event.color.replace('.main', '.contrastText')
        : 'common.black';

    let start = eventDateStr(event.start, timeFormat);
    const end = eventDateStr(event.end, timeFormat);

    if (
        (start.endsWith('AM') && end.endsWith('AM')) ||
        (start.endsWith('PM') && end.endsWith('PM'))
    ) {
        start = start.replace(' AM', '').replace(' PM', '');
    }

    const quarterHours = Math.abs(event.start.getTime() - event.end.getTime()) / 900000;
    const maxLines = 2 + Math.max(0, quarterHours - 4);

    return (
        <Stack
            sx={{
                height: '100%',
                backgroundColor: event.color,
                color: textColor,
                fontSize: '0.775em',
                pl: 0.55,
                pt: 0.25,
            }}
            {...props}
        >
            <Typography
                sx={{
                    fontSize: 'inherit',
                    color: 'inherit',
                    WebkitLineClamp: maxLines,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineClamp: maxLines,
                    fontWeight: 'bold',
                    lineHeight: 1.3,
                }}
            >
                {event.title}
            </Typography>
            <Typography
                sx={{
                    fontSize: 'inherit',
                    color: 'inherit',
                }}
            >
                {start} – {end}
            </Typography>
        </Stack>
    );
}

function eventDateStr(date: Date, timeFormat: TimeFormat | undefined): string {
    return date
        .toLocaleTimeString(undefined, {
            hour12: timeFormat === TimeFormat.TwelveHour,
            hour: 'numeric',
            minute: 'numeric',
        })
        .replace(':00', '');
}
