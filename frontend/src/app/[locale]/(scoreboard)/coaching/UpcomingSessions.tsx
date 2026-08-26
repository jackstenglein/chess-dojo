'use client';

import { useEvents } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import { Event, getEventStart } from '@/database/event';
import { User } from '@/database/user';
import { CalendarToday, FormatListBulleted } from '@mui/icons-material';
import { Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type JSX } from 'react';
import CoachingCalendar from './CoachingCalendar';
import CoachingList, { displayEvent } from './CoachingList';

interface UpcomingSessionsProps {
    header?: (
        view: string,
        onChangeView: (_: React.MouseEvent<HTMLElement>, newValue: string | null) => void,
    ) => JSX.Element & React.ReactNode;
    filterFunction?: (e: Event, u?: User) => boolean;
}

const UpcomingSessions: React.FC<UpcomingSessionsProps> = ({ header, filterFunction }) => {
    const t = useTranslations('coaching');
    const viewer = useAuth().user;
    const { events, putEvent, removeEvent, request } = useEvents();

    const predicate = filterFunction || displayEvent;
    const coachingEvents = useMemo(
        () =>
            events
                .filter((e) => predicate(e, viewer))
                .sort((lhs, rhs) =>
                    getEventStart(lhs)
                        .toISOString()
                        .localeCompare(getEventStart(rhs).toISOString()),
                ),
        [events, viewer, predicate],
    );
    const [view, setView] = useState('list');

    const onChangeView = (_: React.MouseEvent<HTMLElement>, newValue: string | null) => {
        if (newValue) {
            setView(newValue);
        }
    };

    return (
        <Stack spacing={2}>
            {header ? (
                header(view, onChangeView)
            ) : (
                <ToggleButtonGroup exclusive value={view} onChange={onChangeView} size='small'>
                    <ToggleButton value='list'>
                        <Tooltip title={t('upcomingSessions.viewAsList')}>
                            <FormatListBulleted />
                        </Tooltip>
                    </ToggleButton>

                    <ToggleButton value='calendar'>
                        <Tooltip title={t('upcomingSessions.viewInCalendar')}>
                            <CalendarToday />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            )}

            {coachingEvents.length === 0 ? (
                <Stack
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Typography>{t('list.noSessionsFound')}</Typography>
                </Stack>
            ) : view === 'list' ? (
                <CoachingList events={coachingEvents} request={request} />
            ) : (
                <CoachingCalendar
                    events={coachingEvents}
                    putEvent={putEvent}
                    removeEvent={removeEvent}
                    request={request}
                />
            )}
        </Stack>
    );
};

export default UpcomingSessions;
