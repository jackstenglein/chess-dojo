import { Add, Bolt, Check } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { DOJO_WEEK, WeekTask } from '../../class/content';
import {
    Body,
    Condensed,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    ORANGE,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { WEEK, WEEK_MINUTES, WEEK_PLAN } from '../content';
import { EASE_OUT, HOVER, softIn, useAnimatedNumber } from './motion';
import { SUCCESS } from './parts';

const RUSH_DAY = Math.max(
    0,
    DOJO_WEEK.findIndex((day) => day.tasks.some(isRush)),
);

const DAY_NAMES: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
};

function isRush(task: WeekTask): boolean {
    return task.title.includes('Dojo Rush');
}

/** The review tier is being renamed, so its old name is swapped where it shows. */
function planName(category: string): string {
    return category === 'Game & Profile Review' ? 'Sensei Review' : category;
}

function minutesFor(task: WeekTask): number {
    return WEEK_MINUTES[task.short] ?? 30;
}

/** Minutes the way the training plan writes them: 20 is "20m", 80 is "1h 20m". */
export function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) {
        return `${rest}m`;
    }
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

const DAY_MINUTES = DOJO_WEEK.map((day) =>
    day.tasks.reduce((sum, task) => sum + minutesFor(task), 0),
);
const WEEK_TOTAL = DAY_MINUTES.reduce((sum, minutes) => sum + minutes, 0);

/**
 * Where Rush sits in a member's week, drawn the way the training plan draws a day:
 * the week on top, the day's tasks as cards, and a time goal that fills in as
 * training is logged. The visitor can log a task and watch the day move. The tasks
 * are the /class page's example week.
 */
export function DojoWeek({ onStart }: { onStart?: () => void }) {
    const [selected, setSelected] = useState(RUSH_DAY);
    const [logged, setLogged] = useState<ReadonlySet<string>>(new Set());
    const day = DOJO_WEEK[selected];

    const isLogged = (dayIndex: number, taskIndex: number) =>
        logged.has(`${dayIndex}:${taskIndex}`);
    const workedOn = (dayIndex: number) =>
        DOJO_WEEK[dayIndex].tasks.reduce(
            (sum, task, taskIndex) => sum + (isLogged(dayIndex, taskIndex) ? minutesFor(task) : 0),
            0,
        );

    const toggle = (taskIndex: number) => {
        const key = `${selected}:${taskIndex}`;
        setLogged((current) => {
            const next = new Set(current);
            if (!next.delete(key)) {
                next.add(key);
            }
            return next;
        });
    };

    const worked = workedOn(selected);
    const goal = DAY_MINUTES[selected];
    const doneCount = day.tasks.filter((_, index) => isLogged(selected, index)).length;
    const allDone = doneCount === day.tasks.length;
    const weekWorked = DOJO_WEEK.reduce((sum, _, index) => sum + workedOn(index), 0);

    return (
        <Box sx={{ bgcolor: '#0D0D18', borderBlock: `1px solid ${HAIRLINE}` }}>
            <Section>
                <Heading description={WEEK.body}>{WEEK.heading}</Heading>

                <Box sx={revealSx}>
                    <Stack
                        role='tablist'
                        aria-label='A week in the Dojo'
                        direction='row'
                        sx={{ gap: { xs: 0.5, md: 1 } }}
                    >
                        {DOJO_WEEK.map((weekDay, index) => (
                            <DayTab
                                key={weekDay.day}
                                day={weekDay.day}
                                active={index === selected}
                                hasRush={index === RUSH_DAY}
                                worked={workedOn(index)}
                                goal={DAY_MINUTES[index]}
                                onSelect={() => setSelected(index)}
                            />
                        ))}
                    </Stack>

                    <Box id='dojo-week-panel' role='tabpanel' sx={{ mt: { xs: 2.5, md: 3.5 } }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            sx={{
                                gap: { xs: 1.5, sm: 4 },
                                alignItems: { sm: 'flex-end' },
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ flexGrow: 1, maxWidth: { sm: '32.5rem' } }}>
                                <Stack
                                    direction='row'
                                    sx={{ alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}
                                >
                                    <Condensed component='h3' sx={{ fontSize: '1.75rem' }}>
                                        {DAY_NAMES[day.day] ?? day.day}
                                    </Condensed>
                                    <Stack
                                        direction='row'
                                        aria-live='polite'
                                        sx={{
                                            alignItems: 'center',
                                            gap: 0.5,
                                            color: allDone ? SUCCESS : MUTED,
                                            transition: 'color 200ms ease',
                                        }}
                                    >
                                        {allDone && <Check sx={{ fontSize: '1.1rem' }} />}
                                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                            {allDone
                                                ? `Done for the day · ${formatMinutes(worked)} logged`
                                                : `${doneCount} of ${day.tasks.length} tasks done · ${formatMinutes(worked)} of ${formatMinutes(goal)}`}
                                        </Typography>
                                    </Stack>
                                </Stack>
                                <Meter
                                    share={worked / goal}
                                    color={allDone ? SUCCESS : ORANGE}
                                    height={8}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                            <Typography variant='body2' sx={{ color: MUTED, whiteSpace: 'nowrap' }}>
                                This week: {formatMinutes(weekWorked)} of{' '}
                                {formatMinutes(WEEK_TOTAL)}
                            </Typography>
                        </Stack>

                        <Box
                            key={day.day}
                            sx={{
                                mt: 2.5,
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                                gap: 2,
                                minHeight: { xs: '31rem', md: '14.5rem' },
                                alignContent: 'start',
                            }}
                        >
                            {day.tasks.map((task, index) => (
                                <TaskCard
                                    key={task.title}
                                    task={task}
                                    order={index}
                                    done={isLogged(selected, index)}
                                    onToggle={() => toggle(index)}
                                    onStart={onStart}
                                />
                            ))}
                        </Box>
                    </Box>

                    <Typography variant='body2' sx={{ mt: 2.5, color: MUTED }}>
                        {WEEK.caption}
                    </Typography>
                </Box>
            </Section>
        </Box>
    );
}

/** A thin bar that fills from the left. It moves by transform, so it can be retargeted mid-move. */
function Meter({
    share,
    color,
    height,
    sx,
}: {
    share: number;
    color: string;
    height: number;
    sx?: Record<string, string | number | object>;
}) {
    return (
        <Box
            aria-hidden
            sx={{
                height,
                borderRadius: height / 2,
                overflow: 'hidden',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                ...sx,
            }}
        >
            <Box
                sx={{
                    height: 1,
                    borderRadius: 'inherit',
                    bgcolor: color,
                    transformOrigin: 'left',
                    transform: `scaleX(${Math.min(1, Math.max(0, share))})`,
                    transition: `transform 420ms ${EASE_OUT}, background-color 200ms ease`,
                }}
            />
        </Box>
    );
}

/** One day of the week strip: its name, the time planned and how much of it is logged. */
function DayTab({
    day,
    active,
    hasRush,
    worked,
    goal,
    onSelect,
}: {
    day: string;
    active: boolean;
    hasRush: boolean;
    worked: number;
    goal: number;
    onSelect: () => void;
}) {
    const done = worked >= goal;
    return (
        <Box
            component='button'
            type='button'
            role='tab'
            data-press
            aria-selected={active}
            aria-controls='dojo-week-panel'
            aria-label={`${DAY_NAMES[day] ?? day}, ${formatMinutes(goal)} planned${done ? ', done' : ''}`}
            onClick={onSelect}
            sx={{
                flex: '1 1 0',
                minWidth: 0,
                minHeight: 76,
                px: { xs: 0.5, md: 1.5 },
                py: 1,
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'common.white',
                bgcolor: active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${active ? 'rgba(255, 255, 255, 0.55)' : HAIRLINE}`,
                borderRadius: 2,
                [HOVER]: active
                    ? {}
                    : {
                          '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.07)',
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                      },
            }}
        >
            <Stack
                direction='row'
                component='span'
                sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}
            >
                <Condensed component='span' sx={{ fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
                    {day}
                </Condensed>
                {done ? (
                    <Check sx={{ fontSize: 16, color: SUCCESS }} />
                ) : (
                    hasRush && <Bolt sx={{ fontSize: 16, color: ORANGE }} />
                )}
            </Stack>
            <Typography
                component='span'
                variant='caption'
                sx={{
                    display: 'block',
                    mt: 0.25,
                    color: active ? 'common.white' : MUTED,
                    fontSize: { xs: '0.7rem', md: '0.8rem' },
                    whiteSpace: 'nowrap',
                }}
            >
                {formatMinutes(goal)}
            </Typography>
            <Meter
                share={worked / goal}
                color={done ? SUCCESS : ORANGE}
                height={4}
                sx={{ mt: 0.75 }}
            />
        </Box>
    );
}

/**
 * A task the way the plan's Today view shows one: its category, what to do, the
 * button that logs it and the pill that counts today's time against the goal.
 */
function TaskCard({
    task,
    order,
    done,
    onToggle,
    onStart,
}: {
    task: WeekTask;
    order: number;
    done: boolean;
    onToggle: () => void;
    onStart?: () => void;
}) {
    const rush = isRush(task);
    const goal = minutesFor(task);
    const plan = WEEK_PLAN[task.category];

    return (
        <Stack
            component='article'
            aria-label={task.title}
            sx={{
                p: { xs: 2, md: 2.5 },
                bgcolor: done ? 'rgba(127, 214, 107, 0.05)' : INK_RAISED,
                borderRadius: 3,
                border: `1px solid ${
                    done ? 'rgba(127, 214, 107, 0.45)' : rush ? 'rgba(247, 148, 31, 0.6)' : HAIRLINE
                }`,
                transition: 'border-color 200ms ease, background-color 200ms ease',
                animation: `${softIn} 300ms ${EASE_OUT} ${order * 50}ms both`,
            }}
        >
            <Stack
                direction='row'
                sx={{
                    minHeight: 22,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                }}
            >
                <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75, color: task.color }}>
                    {rush ? (
                        <Bolt aria-hidden sx={{ fontSize: '1rem' }} />
                    ) : (
                        <Box
                            aria-hidden
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'currentColor',
                            }}
                        />
                    )}
                    <Typography
                        variant='caption'
                        sx={{
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                        }}
                    >
                        {planName(task.category)}
                    </Typography>
                </Stack>
                {plan && (
                    <Typography variant='caption' sx={{ color: MUTED, whiteSpace: 'nowrap' }}>
                        {plan}
                    </Typography>
                )}
            </Stack>

            <Condensed
                component='h4'
                sx={{
                    mt: 1.25,
                    fontSize: { xs: '1.45rem', md: '1.6rem' },
                    opacity: done ? 0.75 : 1,
                    transition: 'opacity 200ms ease',
                }}
            >
                {task.title}
            </Condensed>
            <Body
                sx={{
                    mt: 0.5,
                    fontSize: '1rem',
                    opacity: done ? 0.75 : 1,
                    transition: 'opacity 200ms ease',
                }}
            >
                {task.description}
                {rush ? ` ${WEEK.rushNote}.` : ''}
            </Body>

            <Box sx={{ flexGrow: 1, minHeight: 16 }} />
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {rush && onStart && !done ? (
                    <Button
                        variant='contained'
                        color='dojoOrange'
                        disableElevation
                        startIcon={<Bolt />}
                        onClick={onStart}
                        sx={pillButtonSx}
                    >
                        Play this run now
                    </Button>
                ) : null}
                <Button
                    variant={done || (rush && onStart) ? 'outlined' : 'contained'}
                    color={done || (rush && onStart) ? 'inherit' : 'primary'}
                    disableElevation
                    aria-pressed={done}
                    startIcon={done ? <Check /> : <Add />}
                    onClick={onToggle}
                    sx={{
                        ...pillButtonSx,
                        ...(done || (rush && onStart)
                            ? { borderColor: 'rgba(255, 255, 255, 0.35)', color: 'common.white' }
                            : {}),
                    }}
                >
                    {done ? 'Logged' : 'Log training'}
                </Button>
                <Box sx={{ ml: 'auto' }}>
                    <TimePill worked={done ? goal : 0} goal={goal} />
                </Box>
            </Stack>
        </Stack>
    );
}

const pillButtonSx = {
    height: 40,
    px: 2,
    borderRadius: 999,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    textTransform: 'none',
    letterSpacing: 0,
} as const;

/**
 * Today's time on a task. Neutral until the goal is met, then green with a check:
 * not having started is not an error, so it is never red. The number counts up
 * while the pill fills.
 */
function TimePill({ worked, goal }: { worked: number; goal: number }) {
    const shown = useAnimatedNumber(worked, 380);
    const done = worked >= goal;
    return (
        <Box
            sx={{
                position: 'relative',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                height: 30,
                px: 1.25,
                borderRadius: 999,
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: `1px solid ${done ? 'rgba(127, 214, 107, 0.5)' : HAIRLINE}`,
                color: done ? SUCCESS : MUTED,
                transition: 'border-color 200ms ease, color 200ms ease',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(127, 214, 107, 0.14)',
                    transformOrigin: 'left',
                    transform: `scaleX(${done ? 1 : 0})`,
                    transition: `transform 380ms ${EASE_OUT}`,
                }}
            />
            <Check
                aria-hidden
                sx={{
                    position: 'relative',
                    fontSize: '0.95rem',
                    ml: done ? 0 : '-1.1rem',
                    opacity: done ? 1 : 0,
                    transform: done ? 'scale(1)' : 'scale(0.6)',
                    transition: `opacity 180ms ease, transform 220ms ${EASE_OUT}`,
                }}
            />
            <Box component='span' sx={{ position: 'relative' }}>
                {formatMinutes(shown)} / {formatMinutes(goal)}
            </Box>
        </Box>
    );
}
