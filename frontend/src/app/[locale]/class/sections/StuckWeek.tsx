'use client';

import { Check, Close } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useState } from 'react';
import { DOJO_WEEK, STUCK_WEEK, WeekTask } from '../content';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    ORANGE,
    Section,
} from './shared';

const detailIn = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
`;

const tickIn = keyframes`
    0% { transform: scale(0.4); }
    65% { transform: scale(1.25); }
    100% { transform: scale(1); }
`;

const TOTAL_TASKS = DOJO_WEEK.reduce((sum, day) => sum + day.tasks.length, 0);
const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const MISS_COLOR = '#F0776C';

function taskId(day: string, title: string) {
    return `${day}:${title}`;
}

export function StuckWeek() {
    const [done, setDone] = useState<Set<string>>(new Set());
    const [focused, setFocused] = useState<WeekTask>(DOJO_WEEK[1].tasks[0]);

    const toggle = (id: string, task: WeekTask) => {
        setFocused(task);
        setDone((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <Section>
            <Heading description='In the Dojo, work counts when it leaves you tired: a long game, the analysis of that game, hard exercises. We call it sweat work, and we ask for at least three sessions a week. Compare the two weeks, then tick off the Dojo one.'>
                Blitz, videos and puzzle rush don’t count as work
            </Heading>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '0.62fr 1.38fr' },
                    gap: { xs: 2, md: 3 },
                    alignItems: 'stretch',
                }}
            >
                <Stack
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        gap: 1,
                        borderRadius: 3,
                        border: `1px solid ${HAIRLINE}`,
                    }}
                >
                    <Box sx={{ mb: 0.5 }}>
                        <Condensed component='h3' sx={{ fontSize: '1.75rem', color: MUTED }}>
                            A week on your own
                        </Condensed>
                        <Typography variant='caption' sx={{ color: MUTED }}>
                            Plenty of chess, no sweat work
                        </Typography>
                    </Box>
                    {STUCK_WEEK.map((item) => (
                        <Stack
                            key={item.title}
                            direction='row'
                            sx={{
                                gap: 1.25,
                                p: 1.25,
                                alignItems: 'center',
                                borderRadius: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.03)',
                            }}
                        >
                            <Box
                                sx={{
                                    flexShrink: 0,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'grid',
                                    placeItems: 'center',
                                    color: MISS_COLOR,
                                    border: `2px solid ${MISS_COLOR}`,
                                }}
                            >
                                <Close sx={{ fontSize: 18 }} />
                            </Box>
                            <Box>
                                <Condensed sx={{ fontSize: '1.25rem', color: MUTED }}>
                                    {item.title}
                                </Condensed>
                                <Body sx={{ fontSize: '0.95rem', lineHeight: 1.25 }}>
                                    {item.note}
                                </Body>
                            </Box>
                        </Stack>
                    ))}
                    <Condensed
                        sx={{
                            mt: 'auto',
                            pt: 1,
                            fontSize: '1.35rem',
                            fontWeight: 500,
                            color: MISS_COLOR,
                            lineHeight: 1.15,
                        }}
                    >
                        Nobody reviews your games. Nobody asks what you did this week.
                    </Condensed>
                </Stack>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                        borderRadius: 3,
                        bgcolor: INK_RAISED,
                        border: `1px solid ${ORANGE}`,
                        overflow: 'hidden',
                        boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                    }}
                >
                    <Stack
                        direction='row'
                        sx={{
                            px: { xs: 2, md: 2.5 },
                            py: 1.5,
                            gap: 2,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box>
                            <Condensed component='h3' sx={{ fontSize: '1.75rem' }}>
                                A week in the Dojo
                            </Condensed>
                            <Typography variant='caption' sx={{ color: MUTED }}>
                                Example week for a 1100 player
                            </Typography>
                        </Box>
                        <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                            <Box
                                component='svg'
                                viewBox='0 0 64 64'
                                aria-hidden
                                sx={{ width: 44, height: 44, transform: 'rotate(-90deg)' }}
                            >
                                <circle
                                    cx='32'
                                    cy='32'
                                    r={RING_RADIUS}
                                    fill='none'
                                    stroke='rgba(255,255,255,0.12)'
                                    strokeWidth='8'
                                />
                                <Box
                                    component='circle'
                                    cx='32'
                                    cy='32'
                                    r={RING_RADIUS}
                                    fill='none'
                                    stroke={ORANGE}
                                    strokeWidth='8'
                                    strokeLinecap='round'
                                    strokeDasharray={RING_LENGTH}
                                    strokeDashoffset={RING_LENGTH * (1 - done.size / TOTAL_TASKS)}
                                    sx={{ transition: `stroke-dashoffset 500ms ${EASE_OUT}` }}
                                />
                            </Box>
                            <Box>
                                <Condensed sx={{ fontSize: '1.2rem' }}>
                                    {done.size} of {TOTAL_TASKS} done
                                </Condensed>
                                <Typography variant='caption' sx={{ color: MUTED }}>
                                    {done.size === TOTAL_TASKS
                                        ? 'That’s a week in the Dojo.'
                                        : 'Click a task to tick it off'}
                                </Typography>
                            </Box>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(7, minmax(0, 1fr))' },
                            borderBlock: `1px solid ${HAIRLINE}`,
                        }}
                    >
                        {DOJO_WEEK.map((day, dayIndex) => (
                            <Box
                                key={day.day}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '2.75rem 1fr 1fr', md: '1fr' },
                                    gridTemplateRows: { md: 'auto 1fr 1fr' },
                                    alignItems: 'stretch',
                                    gap: 0.5,
                                    p: 0.5,
                                    borderTop: {
                                        xs: dayIndex ? `1px solid ${HAIRLINE}` : 'none',
                                        md: 'none',
                                    },
                                    borderLeft: {
                                        md: dayIndex ? `1px solid ${HAIRLINE}` : 'none',
                                    },
                                }}
                            >
                                <Condensed
                                    component='h4'
                                    sx={{
                                        alignSelf: 'center',
                                        textAlign: 'center',
                                        fontSize: '1.05rem',
                                        py: { md: 0.25 },
                                    }}
                                >
                                    {day.day}
                                </Condensed>
                                {day.tasks.map((task) => {
                                    const id = taskId(day.day, task.title);
                                    const checked = done.has(id);
                                    return (
                                        <Box
                                            key={task.title}
                                            component='button'
                                            type='button'
                                            role='checkbox'
                                            aria-checked={checked}
                                            aria-label={`${task.title}: ${task.category}`}
                                            onClick={() => toggle(id, task)}
                                            onMouseEnter={() => setFocused(task)}
                                            onFocus={() => setFocused(task)}
                                            sx={{
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.5,
                                                p: 0.75,
                                                minHeight: { xs: 64, md: '6.5rem' },
                                                font: 'inherit',
                                                textAlign: 'left',
                                                color: 'common.white',
                                                cursor: 'pointer',
                                                borderRadius: 1.25,
                                                border: `1px solid ${task.color}${checked ? '' : '66'}`,
                                                bgcolor: `${task.color}${checked ? '40' : '14'}`,
                                                transition: `background-color 220ms ${EASE_OUT}, border-color 220ms ${EASE_OUT}, translate 220ms ${EASE_OUT}`,
                                                '@media (hover: hover)': {
                                                    '&:hover': {
                                                        translate: '0 -2px',
                                                        borderColor: task.color,
                                                        bgcolor: `${task.color}30`,
                                                    },
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    flexShrink: 0,
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    color: '#0b0b12',
                                                    border: `2px solid ${task.color}`,
                                                    bgcolor: checked ? task.color : 'transparent',
                                                    transition: `background-color 200ms ${EASE_OUT}`,
                                                }}
                                            >
                                                {checked && (
                                                    <Check
                                                        sx={{
                                                            fontSize: 15,
                                                            animation: `${tickIn} 350ms ${EASE_OUT} both`,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: '0.82rem',
                                                    lineHeight: 1.12,
                                                }}
                                            >
                                                {task.short}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>

                    <Box
                        key={focused.title}
                        sx={{
                            flexGrow: 1,
                            px: { xs: 2, md: 2.5 },
                            py: 1.25,
                            minHeight: '5.75rem',
                            animation: `${detailIn} 300ms ${EASE_OUT} both`,
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{ color: focused.color, fontWeight: 600 }}
                        >
                            {focused.category}
                        </Typography>
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            sx={{
                                columnGap: 1.25,
                                alignItems: { md: 'baseline' },
                                flexWrap: 'wrap',
                            }}
                        >
                            <Condensed sx={{ fontSize: '1.35rem' }}>{focused.title}</Condensed>
                            <Body sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                                {focused.description}
                            </Body>
                        </Stack>
                    </Box>
                </Box>
            </Box>
        </Section>
    );
}
