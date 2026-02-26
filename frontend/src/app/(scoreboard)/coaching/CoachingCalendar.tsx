import { useApi } from '@/api/Api';
import { Request, RequestSnackbar, useRequest } from '@/api/Request';
import { getProcessedEvents } from '@/app/(scoreboard)/calendar/CalendarPage';
import { useAuth } from '@/auth/Auth';
import EventEditor from '@/components/calendar/eventEditor/EventEditor';
import ProcessedEventViewer from '@/components/calendar/eventViewer/ProcessedEventViewer';
import { getHours, useFilters } from '@/components/calendar/filters/CalendarFilters';
import TimezoneFilter from '@/components/calendar/filters/TimezoneFilter';
import { DefaultTimezone } from '@/components/calendar/filters/TimezoneSelector';
import { Event } from '@/database/event';
import { TimeFormat } from '@/database/user';
import { Scheduler } from '@jackstenglein/react-scheduler';
import { ProcessedEvent, SchedulerRef } from '@jackstenglein/react-scheduler/types';
import { Grid, Stack } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CoachingCalendarProps {
    events: Event[];
    putEvent: (e: Event) => void;
    removeEvent: (id: string) => void;
    request: Request;
}

const CoachingCalendar: React.FC<CoachingCalendarProps> = ({
    events,
    putEvent,
    removeEvent,
    request,
}) => {
    const api = useApi();
    const user = useAuth().user;
    const calendarRef = useRef<SchedulerRef>(null);
    const filters = useFilters();

    const [shiftHeld, setShiftHeld] = useState(false);
    const copyRequest = useRequest();
    const deleteRequest = useRequest<string>();

    const processedEvents = useMemo(() => {
        const modifiedFilters = { ...filters, coaching: true };
        return getProcessedEvents(user, modifiedFilters, events);
    }, [user, filters, events]);

    useEffect(() => {
        calendarRef.current?.scheduler.handleState(processedEvents, 'events');
    }, [processedEvents, calendarRef]);

    const deleteAvailability = useCallback(
        async (id: string) => {
            try {
                // Don't use deleteRequest.onStart as it messes up the
                // scheduler library
                await api.deleteEvent(id);
                removeEvent(id);
                deleteRequest.onSuccess('Availability deleted');
                return id;
            } catch (err) {
                deleteRequest.onFailure(err);
            }
        },
        [api, removeEvent, deleteRequest],
    );

    const downHandler = useCallback(
        ({ key }: { key: string }) => {
            if (key === 'Shift') {
                setShiftHeld(true);
            }
        },
        [setShiftHeld],
    );

    const upHandler = useCallback(
        ({ key }: { key: string }) => {
            if (key === 'Shift') {
                setShiftHeld(false);
            }
        },
        [setShiftHeld],
    );

    useEffect(() => {
        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);
        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [downHandler, upHandler]);

    const view = calendarRef.current?.scheduler.view;
    const copyAvailability = useCallback(
        async (
            _event: React.DragEvent<HTMLButtonElement>,
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

                const event = originalEvent.event as Event | undefined;

                let id = event?.id;
                let discordMessageId = event?.discordMessageId;
                let privateDiscordEventId = event?.privateDiscordEventId;
                let publicDiscordEventId = event?.publicDiscordEventId;

                // If shift is held, then set the id and discord ids to
                // undefined in order to create a new event
                if (shiftHeld) {
                    id = undefined;
                    discordMessageId = undefined;
                    privateDiscordEventId = undefined;
                    publicDiscordEventId = undefined;
                }

                const response = await api.setEvent({
                    ...event,
                    startTime: startIso,
                    endTime: endIso,
                    id,
                    discordMessageId,
                    privateDiscordEventId,
                    publicDiscordEventId,
                });
                const availability = response.data;

                putEvent(availability);
                copyRequest.onSuccess();
            } catch (err) {
                copyRequest.onFailure(err);
            }
        },
        [copyRequest, api, shiftHeld, view, putEvent],
    );

    const [minHour, maxHour] = getHours(filters.minHour, filters.maxHour);

    return (
        <Grid container spacing={2}>
            <RequestSnackbar request={request} />
            <Grid
                size={{
                    xs: 12,
                    md: 2.5,
                }}
            >
                <Stack
                    data-testid='calendar-filters'
                    sx={{
                        pt: 0.5,
                        pb: 2,
                        position: { md: 'sticky' },
                        top: { md: '88px' },
                    }}
                    spacing={{ xs: 3, sm: 4 }}
                >
                    <TimezoneFilter filters={filters} />
                </Stack>
            </Grid>
            <Grid
                size={{
                    xs: 12,
                    md: 9.5,
                }}
            >
                <Scheduler
                    ref={calendarRef}
                    editable={user?.isCoach}
                    month={{
                        weekDays: [0, 1, 2, 3, 4, 5, 6],
                        weekStartOn: 0,
                        startHour: minHour,
                        endHour: maxHour,
                        navigation: true,
                        step: 60,
                    }}
                    week={{
                        weekDays: [0, 1, 2, 3, 4, 5, 6],
                        weekStartOn: 0,
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
                    customEditor={(scheduler) => <EventEditor scheduler={scheduler} />}
                    onDelete={deleteAvailability}
                    onEventDrop={copyAvailability}
                    viewerExtraComponent={(_, event) => (
                        <ProcessedEventViewer processedEvent={event} />
                    )}
                    events={processedEvents}
                    timeZone={filters.timezone === DefaultTimezone ? undefined : filters.timezone}
                    hourFormat={filters.timeFormat || TimeFormat.TwelveHour}
                />
            </Grid>
        </Grid>
    );
};

export default CoachingCalendar;
