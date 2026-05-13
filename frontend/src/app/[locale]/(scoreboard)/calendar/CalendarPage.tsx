'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useEvents } from '@/api/cache/Cache';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { getTimeZonedDate, toRRuleDate } from '@/components/calendar/displayDate';
import EventEditor from '@/components/calendar/eventEditor/EventEditor';
import ProcessedEventViewer from '@/components/calendar/eventViewer/ProcessedEventViewer';
import {
    CalendarFilters,
    Filters,
    getHours,
    useFilters,
} from '@/components/calendar/filters/CalendarFilters';
import { DefaultTimezone } from '@/components/calendar/filters/TimezoneSelector';
import CalendarTutorial from '@/components/tutorial/CalendarTutorial';
import {
    AvailabilityType,
    CalendarSessionType,
    Event,
    EventStatus,
    EventType,
    TimeControlType,
} from '@/database/event';
import { ALL_COHORTS, isFree, TimeFormat, User } from '@/database/user';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { Scheduler } from '@jackstenglein/react-scheduler';
import type { EventRendererProps, SchedulerRef } from '@jackstenglein/react-scheduler/types';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Button, Container, Grid, Snackbar, Stack, Typography } from '@mui/material';
import { de as dateFnsDe, enUS as dateFnsEnUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RRule } from 'rrule';

const SCHEDULER_LOCALES = {
    en: dateFnsEnUS,
    pseudo: dateFnsEnUS,
    de: dateFnsDe,
} as const;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function processAvailability(
    user: User | undefined,
    filters: Filters,
    event: Event,
    t: TranslateFn,
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

        return {
            event_id: event.id,
            title,
            start: new Date(event.bookedStartTime || event.startTime),
            end: new Date(event.endTime),
            color: 'meet.main',
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
        return {
            event_id: event.id,
            title: title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            color: 'info.main',
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
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        color: 'book.main',
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
    let color = 'dojoOrange.main';
    if (location.includes('twitch')) {
        color = 'twitch.main';
    } else if (location.includes('youtube')) {
        color = 'youtube.main';
    }

    const rruleOptions = event.rrule ? RRule.parseString(event.rrule) : undefined;
    if (rruleOptions) {
        rruleOptions.dtstart = toRRuleDate(new Date(event.startTime));
    }

    return {
        event_id: event.id,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        color: event.color || color,
        editable: user?.isAdmin || user?.isCalendarAdmin,
        deletable: user?.isAdmin || user?.isCalendarAdmin,
        draggable: user?.isAdmin || user?.isCalendarAdmin,
        isOwner: false,
        event,
        recurring: rruleOptions ? new RRule(rruleOptions) : undefined,
    };
}

function processLigaTournament(
    user: User | undefined,
    filters: Filters,
    event: Event,
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
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        color: event.color || 'liga.main',
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

    const rruleOptions = event.rrule ? RRule.parseString(event.rrule) : undefined;
    if (rruleOptions) {
        rruleOptions.dtstart = toRRuleDate(new Date(event.startTime));
    }

    return {
        event_id: event.id,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        color: event.color || 'coaching.main',
        editable: isOwner,
        deletable: isOwner && Object.values(event.participants).length === 0,
        draggable: isOwner,
        isOwner,
        event,
        recurring: rruleOptions ? new RRule(rruleOptions) : undefined,
    };
}

export function processLiveClassEvent(
    user: User | undefined,
    filters: Filters,
    event: Event,
): ProcessedEvent | null {
    const eventType = event.type as unknown as CalendarSessionType;
    if (
        filters.sessions[0] !== CalendarSessionType.AllSessions &&
        !filters.sessions.includes(eventType)
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

    const rruleOptions = event.rrule ? RRule.parseString(event.rrule) : undefined;
    if (rruleOptions) {
        rruleOptions.dtstart = toRRuleDate(new Date(event.startTime));
    }

    return {
        event_id: event.id,
        title: event.title,
        start: new Date(event.startTime),
        end: new Date(event.endTime),
        color: event.color
            ? event.color
            : event.type === EventType.LectureTier
              ? 'sage.main'
              : 'peacock.main',
        editable: isOwner,
        deletable: isOwner && Object.values(event.participants).length === 0,
        draggable: isOwner,
        isOwner,
        event,
        recurring: rruleOptions ? new RRule(rruleOptions) : undefined,
    };
}

export function getProcessedEvents(
    user: User | undefined,
    filters: Filters,
    events: Event[],
    t: TranslateFn,
): ProcessedEvent[] {
    const result: ProcessedEvent[] = [];

    for (const event of events) {
        let processedEvent: ProcessedEvent | null = null;

        const startHour = getTimeZonedDate(new Date(event.startTime), filters.timezone).getHours();
        if (
            startHour < (filters?.minHour?.hour || 0) ||
            startHour > (filters?.maxHour?.hour || 24)
        ) {
            continue;
        }

        if (event.type === EventType.Availability) {
            processedEvent = processAvailability(user, filters, event, t);
        } else if (event.type === EventType.Dojo) {
            processedEvent = processDojoEvent(user, filters, event);
        } else if (event.type === EventType.LigaTournament) {
            processedEvent = processLigaTournament(user, filters, event);
        } else if (event.type === EventType.Coaching) {
            processedEvent = processCoachingEvent(user, filters, event);
        } else if (
            event.type === EventType.LectureTier ||
            event.type === EventType.GameReviewTier
        ) {
            processedEvent = processLiveClassEvent(user, filters, event);
        }

        if (processedEvent !== null) {
            result.push(processedEvent);
        }
    }

    return result;
}

export default function CalendarPage() {
    const t = useTranslations('calendar');
    const locale = useLocale();
    const schedulerLocale =
        SCHEDULER_LOCALES[locale as keyof typeof SCHEDULER_LOCALES] ?? dateFnsEnUS;
    const { user } = useAuth();
    const api = useApi();
    const isFreeTier = useFreeTier();
    const [canceled, setCanceled] = useState(false);

    const { events, putEvent, removeEvent, request } = useEvents();

    const filters = useFilters();

    const calendarRef = useRef<SchedulerRef>(null);
    const view = calendarRef.current?.scheduler.view;

    const copyRequest = useRequest();
    const deleteRequest = useRequest<string>();

    const [showFilters, setShowFilters] = useState(true);

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

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
        [api, removeEvent, deleteRequest],
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

                if (view === 'month') {
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

                copyRequest.onStart();

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

                let rrule = '';
                if (dojoEvent?.rrule) {
                    const options = RRule.parseString(dojoEvent.rrule);
                    options.dtstart = new Date(startIso);
                    rrule = RRule.optionsToString(options);
                }

                const response = await api.setEvent({
                    ...dojoEvent,
                    startTime: startIso,
                    endTime: endIso,
                    id,
                    discordMessageId,
                    privateDiscordEventId,
                    publicDiscordEventId,
                    rrule,
                });
                const availability = response.data;

                putEvent(availability);
                copyRequest.onSuccess();
            } catch (err) {
                copyRequest.onFailure(err);
            }
        },
        [copyRequest, api, view, putEvent],
    );

    const processedEvents = useMemo(() => {
        return getProcessedEvents(user, filters, events, t);
    }, [user, filters, events, t]);

    useEffect(() => {
        calendarRef.current?.scheduler.handleState(processedEvents, 'events');
    }, [processedEvents, calendarRef]);

    useEffect(() => {
        const timezone = filters.timezone === DefaultTimezone ? undefined : filters.timezone;
        calendarRef.current?.scheduler.handleState(timezone, 'timeZone');
    }, [calendarRef, filters.timezone]);

    useEffect(() => {
        calendarRef.current?.scheduler.handleState(filters.timeFormat, 'hourFormat');
        calendarRef.current?.scheduler.handleState(
            (props: EventRendererProps) =>
                CustomEventRenderer({
                    ...props,
                    timeFormat: filters.timeFormat,
                }),
            'eventRenderer',
        );
    }, [calendarRef, filters.timeFormat]);

    const weekStartOn = filters.weekStartOn;
    const [minHour, maxHour] = getHours(filters.minHour, filters.maxHour);

    useEffect(() => {
        calendarRef.current?.scheduler.handleState(
            {
                weekDays: [0, 1, 2, 3, 4, 5, 6],
                weekStartOn: weekStartOn,
                startHour: minHour,
                endHour: maxHour,
                navigation: true,
                step: 60,
            },
            'month',
        );
        calendarRef.current?.scheduler.handleState(
            {
                weekDays: [0, 1, 2, 3, 4, 5, 6],
                weekStartOn: weekStartOn,
                startHour: minHour,
                endHour: maxHour,
                step: 60,
                navigation: true,
            },
            'week',
        );
        calendarRef.current?.scheduler.handleState(
            {
                startHour: minHour,
                endHour: maxHour,
                step: 60,
                navigation: true,
            },
            'day',
        );
    }, [calendarRef, weekStartOn, minHour, maxHour]);

    return (
        <Container sx={{ py: 3 }} maxWidth={false}>
            <RequestSnackbar request={request} />
            <RequestSnackbar request={deleteRequest} showSuccess />
            <RequestSnackbar request={copyRequest} />
            <Snackbar
                open={canceled}
                autoHideDuration={6000}
                onClose={() => setCanceled(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={t('meetingCanceled')}
            />

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 2.5, xl: 2 }}>
                    <Button
                        onClick={toggleFilters}
                        startIcon={showFilters ? <VisibilityOff /> : <Visibility />}
                        sx={{ display: { xs: 'none', md: 'inline-flex' } }}
                    >
                        {showFilters ? t('hideFilters') : t('showFilters')}
                    </Button>
                    {showFilters && <CalendarFilters filters={filters} />}
                </Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: showFilters ? 9.5 : 12,
                        xl: showFilters ? 10 : 12,
                    }}
                >
                    <Stack spacing={3}>
                        <Scheduler
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
                            customEditor={(scheduler) =>
                                isFreeTier ? (
                                    <UpsellDialog
                                        open={true}
                                        onClose={() => scheduler.close()}
                                        currentAction={RestrictedAction.AddCalendarEvents}
                                    />
                                ) : (
                                    <EventEditor scheduler={scheduler} />
                                )
                            }
                            onDelete={deleteAvailability}
                            onEventDrop={copyAvailability}
                            viewerExtraComponent={(_, event) => (
                                <ProcessedEventViewer processedEvent={event} />
                            )}
                            events={processedEvents}
                            timeZone={
                                filters.timezone === DefaultTimezone ? undefined : filters.timezone
                            }
                            hourFormat={filters.timeFormat || TimeFormat.TwelveHour}
                            eventRenderer={(props) =>
                                CustomEventRenderer({
                                    ...props,
                                    timeFormat: filters.timeFormat,
                                })
                            }
                        />
                    </Stack>
                </Grid>
            </Grid>

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
                fontSize='inherit'
                color='inherit'
                sx={{
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
            <Typography fontSize='inherit' color='inherit'>
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
