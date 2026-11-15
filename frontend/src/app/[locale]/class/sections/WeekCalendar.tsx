'use client';

import davidImage from '@/components/landing/david.webp';
import jesseImage from '@/components/landing/jesse.webp';
import kostyaImage from '@/components/landing/kostya.webp';
import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image from 'next/image';
import { useState, useSyncExternalStore } from 'react';
import friedelImage from '../assets/friedel.webp';
import perelshteynImage from '../assets/perelshteyn.webp';
import tatevImage from '../assets/tatev.webp';
import { CalendarSession, DOJO_CALENDAR, REVIEW_TEAMS, SessionTeacher } from '../content';
import { Body, Condensed, EASE_OUT, HAIRLINE, INK_RAISED, MUTED, ORANGE } from './shared';

const TEACHER_IMAGES: Record<SessionTeacher, string> = {
    jesse: jesseImage,
    kostya: kostyaImage,
    david: davidImage,
    friedel: friedelImage,
    tatev: tatevImage,
    perelshteyn: perelshteynImage,
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** The same colors the ChessDojo calendar uses for these event types. */
const KIND_COLORS = { workshop: '#2E9E6B', review: '#2F7FC7' };
const WORKSHOPS_ONLY = 'workshops';
const DEFAULT_TEAM = 'Steinitz';

const cardIn = keyframes`
    from { opacity: 0; transform: translateY(14px) scale(0.94); }
    to { opacity: 1; transform: none; }
`;

const panelIn = keyframes`
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
`;

const subscribeToNothing = () => () => undefined;

/** Class times are stored in UTC. Visitors see them in their own timezone. */
function useTimeZone() {
    return useSyncExternalStore(
        subscribeToNothing,
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
        () => 'America/New_York',
    );
}

/** Today as a day count, so the header can show this week's dates after hydration. */
function useToday() {
    return useSyncExternalStore(
        subscribeToNothing,
        () => Math.floor(Date.now() / 86_400_000),
        () => 0,
    );
}

interface LocalSession extends CalendarSession {
    day: string;
    time: string;
    minutes: number;
}

function toLocal(session: CalendarSession, timeZone: string): LocalSession {
    const parts = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone,
    }).formatToParts(new Date(session.utc));
    const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const hour = Number(read('hour'));
    const minute = read('minute');
    const suffix = hour < 12 ? 'AM' : 'PM';
    return {
        ...session,
        day: read('weekday'),
        time: `${hour % 12 || 12}:${minute} ${suffix}`,
        minutes: hour * 60 + Number(minute),
    };
}

function weekDates(today: number) {
    if (!today) {
        return { dates: [] as number[], todayIndex: -1 };
    }
    const now = new Date(today * 86_400_000);
    const todayIndex = (now.getUTCDay() + 6) % 7;
    const dates = DAYS.map((_, index) =>
        new Date((today - todayIndex + index) * 86_400_000).getUTCDate(),
    );
    return { dates, todayIndex };
}

function SessionCard({
    session,
    index,
    selected,
    onSelect,
}: {
    session: LocalSession;
    index: number;
    selected: boolean;
    onSelect: () => void;
}) {
    const color = KIND_COLORS[session.kind];

    return (
        <Box
            component='button'
            type='button'
            aria-pressed={selected}
            onClick={onSelect}
            sx={{
                display: 'block',
                width: 1,
                height: '9.25rem',
                p: 0,
                overflow: 'hidden',
                font: 'inherit',
                textAlign: 'left',
                color: 'common.white',
                cursor: 'pointer',
                borderRadius: 1.5,
                border: `2px solid ${selected ? ORANGE : color}`,
                bgcolor: color,
                animation: `${cardIn} 500ms ${EASE_OUT} ${index * 60}ms both`,
                transition: `box-shadow 250ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}, translate 250ms ${EASE_OUT}`,
                '& .cover': { transition: `transform 500ms ${EASE_OUT}` },
                '@media (hover: hover)': {
                    '&:hover': {
                        translate: '0 -4px',
                        boxShadow: '0 16px 30px rgba(0, 0, 0, 0.6)',
                    },
                    '&:hover .cover': { transform: 'scale(1.08)' },
                },
            }}
        >
            <Box sx={{ height: '5.1rem', overflow: 'hidden' }}>
                <Box
                    className='cover'
                    component='img'
                    src={session.coverUrl}
                    alt=''
                    sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
                />
            </Box>
            <Box sx={{ px: 0.75, py: 0.5 }}>
                <Typography
                    variant='body2'
                    sx={{
                        fontWeight: 700,
                        lineHeight: 1.12,
                        fontSize: '0.84rem',
                        height: '1.9rem',
                        overflow: 'hidden',
                    }}
                >
                    {session.title}
                </Typography>
                <Typography variant='caption' sx={{ display: 'block', lineHeight: 1.2 }}>
                    {session.time}
                </Typography>
            </Box>
        </Box>
    );
}

function SessionDetail({ session }: { session: LocalSession }) {
    const color = KIND_COLORS[session.kind];

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '15rem 1fr' },
                gap: { xs: 1.75, md: 2.5 },
                p: { xs: 1.5, md: 1.5 },
                alignItems: 'center',
                borderRadius: 3,
                bgcolor: INK_RAISED,
                border: `1px solid ${color}`,
                animation: `${panelIn} 450ms ${EASE_OUT} both`,
            }}
        >
            <Box
                component='img'
                src={session.coverUrl}
                alt=''
                sx={{
                    width: 1,
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: 2,
                    display: 'block',
                }}
            />
            <Box>
                <Stack direction='row' sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box
                        sx={{
                            px: 1,
                            borderRadius: 1,
                            bgcolor: color,
                            fontWeight: 600,
                            fontSize: '0.85rem',
                        }}
                    >
                        {session.kind === 'workshop' ? 'Workshop' : 'Game & Profile Review'}
                    </Box>
                    <Typography variant='body2' sx={{ color: MUTED }}>
                        {session.day} at {session.time} · 1 hour
                    </Typography>
                    {session.audience && (
                        <Typography variant='body2' sx={{ color: ORANGE, fontWeight: 600 }}>
                            {session.audience}
                        </Typography>
                    )}
                </Stack>
                <Stack
                    direction='row'
                    sx={{ mt: 0.5, alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}
                >
                    <Condensed
                        component='h4'
                        sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' }, fontWeight: 500 }}
                    >
                        {session.title}
                    </Condensed>
                    {session.teacher && (
                        <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                }}
                            >
                                <Image
                                    src={TEACHER_IMAGES[session.teacher]}
                                    alt=''
                                    sizes='28px'
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </Box>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                {session.teacherName}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
                <Body sx={{ mt: 0.5, fontSize: '1.02rem', lineHeight: 1.4 }}>
                    {session.description}
                </Body>
            </Box>
        </Box>
    );
}

export function WeekCalendar() {
    const [team, setTeam] = useState<string>(DEFAULT_TEAM);
    const [selectedTitle, setSelectedTitle] = useState('Calculation 1000+');
    const timeZone = useTimeZone();
    const { dates, todayIndex } = weekDates(useToday());

    // A member is only on one review team, so the week shows that team and the workshops.
    const sessions = DOJO_CALENDAR.filter(
        (session) => session.kind === 'workshop' || session.title.startsWith(`Team ${team} `),
    )
        .map((session) => toLocal(session, timeZone))
        .sort((a, b) => a.minutes - b.minutes);

    const selected =
        sessions.find((session) => session.title === selectedTitle) ??
        sessions.find((session) => session.title === 'Calculation 1000+') ??
        sessions[0];

    const options = [
        { id: WORKSHOPS_ONLY, label: 'Workshops only' },
        ...REVIEW_TEAMS.map((item) => ({
            id: item.name,
            label: `Team ${item.name} · ${item.band}`,
        })),
    ];

    return (
        <Box>
            <Stack sx={{ mb: 2, gap: 1 }}>
                <Condensed sx={{ fontSize: '1.3rem' }}>
                    Find your week: pick your review team
                </Condensed>
                <Stack
                    role='radiogroup'
                    aria-label='Choose your review team'
                    direction='row'
                    sx={{ gap: 0.75, flexWrap: 'wrap' }}
                >
                    {options.map((option) => {
                        const active = team === option.id;
                        return (
                            <Box
                                key={option.id}
                                component='button'
                                type='button'
                                role='radio'
                                aria-checked={active}
                                onClick={() => setTeam(option.id)}
                                sx={{
                                    minHeight: 44,
                                    px: 1.5,
                                    font: 'inherit',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    borderRadius: 5,
                                    border: `1px solid ${active ? ORANGE : HAIRLINE}`,
                                    color: active ? '#0b0b12' : 'common.white',
                                    bgcolor: active ? ORANGE : 'transparent',
                                    transition: `background-color 250ms ${EASE_OUT}, color 250ms ${EASE_OUT}, border-color 250ms ${EASE_OUT}`,
                                }}
                            >
                                {option.label}
                            </Box>
                        );
                    })}
                </Stack>
                <Typography variant='body2' sx={{ color: MUTED }}>
                    Times are in your timezone. Click any class to see what it covers.
                </Typography>
            </Stack>

            {/* Desktop: a full week at a glance */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${HAIRLINE}`,
                    bgcolor: '#121212',
                }}
            >
                {DAYS.map((day, dayIndex) => (
                    <Box
                        key={day}
                        sx={{
                            minHeight: '22.5rem',
                            borderLeft: dayIndex ? `1px solid ${HAIRLINE}` : 'none',
                        }}
                    >
                        <Stack
                            direction='row'
                            sx={{
                                py: 0.75,
                                gap: 0.75,
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: INK_RAISED,
                                borderBottom: `1px solid ${HAIRLINE}`,
                            }}
                        >
                            <Typography
                                variant='body2'
                                sx={{ color: dayIndex === todayIndex ? '#90CAF9' : MUTED }}
                            >
                                {day}
                            </Typography>
                            <Box
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    display: 'grid',
                                    placeItems: 'center',
                                    color: dayIndex === todayIndex ? '#0b0b12' : 'common.white',
                                    bgcolor: dayIndex === todayIndex ? '#90CAF9' : 'transparent',
                                }}
                            >
                                {dates[dayIndex] ?? ''}
                            </Box>
                        </Stack>
                        <Stack key={team} sx={{ p: 0.6, gap: 0.6 }}>
                            {sessions
                                .filter((session) => session.day === day)
                                .map((session, index) => (
                                    <SessionCard
                                        key={session.title}
                                        session={session}
                                        index={dayIndex + index}
                                        selected={session.title === selected.title}
                                        onSelect={() => setSelectedTitle(session.title)}
                                    />
                                ))}
                        </Stack>
                    </Box>
                ))}
            </Box>

            {/* Phones: the same week as a day-by-day list */}
            <Stack key={`list-${team}`} sx={{ display: { xs: 'flex', md: 'none' }, gap: 1.5 }}>
                {DAYS.map((day) => {
                    const daySessions = sessions.filter((session) => session.day === day);
                    if (!daySessions.length) {
                        return null;
                    }
                    return (
                        <Box key={day}>
                            <Condensed
                                component='h4'
                                sx={{ mb: 0.5, fontSize: '1.2rem', textTransform: 'uppercase' }}
                            >
                                {day}
                            </Condensed>
                            <Stack sx={{ gap: 0.75 }}>
                                {daySessions.map((session) => (
                                    <Box
                                        key={session.title}
                                        component='button'
                                        type='button'
                                        aria-pressed={session.title === selected.title}
                                        onClick={() => setSelectedTitle(session.title)}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '6rem 1fr',
                                            gap: 1.25,
                                            p: 0.75,
                                            alignItems: 'center',
                                            font: 'inherit',
                                            textAlign: 'left',
                                            color: 'common.white',
                                            cursor: 'pointer',
                                            borderRadius: 1.5,
                                            border: `2px solid ${
                                                session.title === selected.title
                                                    ? ORANGE
                                                    : KIND_COLORS[session.kind]
                                            }`,
                                            bgcolor: `${KIND_COLORS[session.kind]}40`,
                                        }}
                                    >
                                        <Box
                                            component='img'
                                            src={session.coverUrl}
                                            alt=''
                                            loading='lazy'
                                            sx={{
                                                width: 1,
                                                aspectRatio: '16 / 9',
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                                display: 'block',
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant='body2'
                                                sx={{ fontWeight: 700, lineHeight: 1.15 }}
                                            >
                                                {session.title}
                                            </Typography>
                                            <Typography variant='caption' sx={{ color: MUTED }}>
                                                {session.time}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>

            <Box sx={{ mt: 1.5 }}>
                <SessionDetail key={selected.title} session={selected} />
            </Box>
        </Box>
    );
}
