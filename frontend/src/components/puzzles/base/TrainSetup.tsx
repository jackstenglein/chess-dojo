'use client';

import { TrainingPlanIcon } from '@/components/profile/trainingPlan/TrainingPlanIcon';
import { RequirementCategory } from '@/database/requirement';
import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    hasPuzzles,
    TrainingTagSet,
    TrainQuery,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { History, LocalOffer, PlayArrow } from '@mui/icons-material';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Container,
    Divider,
    InputAdornment,
    Paper,
    Slider,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { alpha, darken } from '@mui/material/styles';
import Link from 'next/link';
import { ReactNode, useMemo, useState } from 'react';
import { bucketColor } from './bucketStyle';
import { sortThemes } from './BucketThemeMenu';
import {
    ALL_RATINGS,
    defaultRatingWindow,
    PUZZLES_PER_BATCH,
    RATING_SLIDER_MAX,
    SESSION_MINUTES,
    SessionLength,
} from './trainingPuzzles';

/** The colors of the Start Training button: black and white with an orange edge. */
const ORANGE = '#ff6d00';
const ORANGE_DEEP = darken(ORANGE, 0.22);
const START_PAPER = '#141414';
const START_INK = '#f5f5f5';

/** How the small choice buttons look: the one in use is filled with the main color. */
const CHOICE_SX = {
    '& .MuiToggleButton-root': { px: 2.5, textTransform: 'none', fontWeight: 600 },
    '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
    },
} as const;

/** The kinds of puzzle, and the phases of the game, a member can train on. */
export const PUZZLE_TYPES = ['Tactics', 'Strategy'] as const;
export const PUZZLE_PHASES = ['Opening', 'Middlegame', 'Endgame'] as const;
export type PuzzleType = (typeof PUZZLE_TYPES)[number];
export type PuzzlePhase = (typeof PUZZLE_PHASES)[number];

/** What a member chose to train on: any of these types, in any of these phases. */
export interface TrainSelection {
    types: PuzzleType[];
    phases: PuzzlePhase[];
}

/** Tactics only, in every phase of the game. */
export const DEFAULT_SELECTION: TrainSelection = {
    types: ['Tactics'],
    phases: [...PUZZLE_PHASES],
};

/**
 * How each choice looks: a color deep enough for white text, and an icon. Where the Dojo's
 * training plan has an icon for the same part of the game, this uses it.
 */
const CHOICE_STYLE: Record<PuzzleType | PuzzlePhase, { color: string; icon: ReactNode }> = {
    Tactics: {
        color: '#2e7d32',
        icon: <TrainingPlanIcon category={RequirementCategory.Tactics} />,
    },
    Strategy: { color: '#b88a00', icon: <TrainingPlanIcon category={RequirementCategory.Games} /> },
    Opening: {
        color: '#d84343',
        icon: <TrainingPlanIcon category={RequirementCategory.Opening} />,
    },
    Middlegame: {
        color: '#5757e6',
        icon: <TrainingPlanIcon category={RequirementCategory.Middlegames} />,
    },
    Endgame: {
        color: '#8e5ee0',
        icon: <TrainingPlanIcon category={RequirementCategory.Endgame} />,
    },
};

/** One thing the member can choose to focus on: all themes, or one theme. */
interface FocusOption {
    kind: 'any' | 'theme';
    label: string;
    /** The bucket the option is listed under. */
    group: string;
}

const ANYTHING: FocusOption = { kind: 'any', label: 'All Themes', group: 'All puzzles' };

/**
 * What can be focused on for what the member chose: all themes, and the themes that puzzles of
 * those types and phases have. With a type or phase turned off, the themes that only belong to it
 * are left out. Until the puzzles' tags are known, every theme of the chosen buckets is offered.
 */
export function focusOptions(
    taxonomy: PuzzlebaseTaxonomy,
    selection: TrainSelection,
    available?: TrainingTagSet[],
): FocusOption[] {
    const chosen = new Set<string>([...selection.types, ...selection.phases]);
    const found = (theme: string) =>
        available === undefined || hasPuzzles(available, { ...selection, theme });

    const options: FocusOption[] = [ANYTHING];
    for (const [bucket, themes] of Object.entries(taxonomy.buckets)) {
        const isChoice = bucket in CHOICE_STYLE;
        if (isChoice && !chosen.has(bucket)) continue;
        options.push(
            ...sortThemes(themes)
                .filter(found)
                .map((theme) => ({ kind: 'theme' as const, label: theme, group: bucket })),
        );
    }
    return options;
}

/**
 * The query for what the member chose. A choice that leaves nothing out, such as every phase, asks
 * for nothing, so puzzles that are not tagged with it yet are included.
 */
export function focusQuery(
    selection: TrainSelection,
    focus: FocusOption,
): Pick<TrainQuery, 'types' | 'phases' | 'theme'> {
    return {
        ...(selection.types.length < PUZZLE_TYPES.length
            ? { types: selection.types.join(',') }
            : {}),
        ...(selection.phases.length < PUZZLE_PHASES.length
            ? { phases: selection.phases.join(',') }
            : {}),
        ...(focus.kind === 'theme' ? { theme: focus.label } : {}),
    };
}

interface TrainSetupProps {
    taxonomy: PuzzlebaseTaxonomy;
    /** The tags the puzzles have, so only choices that find puzzles are offered. */
    available?: TrainingTagSet[];
    /** The member's own rating, which the default puzzle rating range is built around. */
    userRating: number;
    /** Whether puzzles are being fetched. */
    loading: boolean;
    /** Something to tell the member, such as that no puzzles matched. */
    message?: string;
    onStart: (query: TrainQuery, length: SessionLength) => void;
}

/**
 * Where a member chooses what to train on: tactics or strategy, which phases of the game, one theme or all, how hard the puzzles are, and for how long. The rating range starts as all ratings.
 */
export function TrainSetup({
    taxonomy,
    available,
    userRating,
    loading,
    message,
    onStart,
}: TrainSetupProps) {
    const aroundYou = useMemo(() => defaultRatingWindow(userRating), [userRating]);
    const [range, setRange] = useState<[number, number]>(ALL_RATINGS);
    const [selection, setSelection] = useState<TrainSelection>(DEFAULT_SELECTION);
    const [focus, setFocus] = useState<FocusOption>(ANYTHING);
    const [length, setLength] = useState<SessionLength>(20);
    const allRatings = range[0] === ALL_RATINGS[0] && range[1] === ALL_RATINGS[1];
    const isAroundYou = range[0] === aroundYou[0] && range[1] === aroundYou[1];

    const options = useMemo(
        () => focusOptions(taxonomy, selection, available),
        [taxonomy, selection, available],
    );

    /** Changes the types or phases chosen. At least one of each stays on, and a theme that no longer fits is dropped. */
    const choose = (next: TrainSelection) => {
        if (next.types.length === 0 || next.phases.length === 0) return;
        setSelection(next);
        const stillThere = focusOptions(taxonomy, next, available).some(
            (o) => o.kind === focus.kind && o.label === focus.label && o.group === focus.group,
        );
        if (!stillThere) setFocus(ANYTHING);
    };

    const start = () =>
        onStart(
            {
                // All ratings leaves the range open, so puzzles above the slider are included.
                ...(allRatings ? {} : { minRating: range[0], maxRating: range[1] }),
                count: PUZZLES_PER_BATCH,
                ...focusQuery(selection, focus),
            },
            length,
        );

    return (
        <Container maxWidth='sm' sx={{ py: { xs: 4, md: 8 } }}>
            <Stack sx={{ gap: 3 }}>
                <Stack sx={{ gap: 0.5 }}>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Train
                    </Typography>
                    <Typography color='text.secondary'>
                        Choose what you’d like to train, then set the puzzle rating and session
                        length, and press Start Training when you’re ready. Every session is saved
                        to your Puzzle Stats. Good luck!
                    </Typography>
                </Stack>

                <Paper variant='outlined' sx={{ p: 3 }}>
                    <Stack sx={{ gap: 3 }}>
                        <ToggleButtonGroup
                            value={selection.types}
                            onChange={(_, value: PuzzleType[]) =>
                                choose({ ...selection, types: value })
                            }
                            aria-label='Type of puzzle'
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 1.5,
                            }}
                        >
                            {PUZZLE_TYPES.map((option) => (
                                <ChoiceCard key={option} option={option} wide />
                            ))}
                        </ToggleButtonGroup>

                        <Divider sx={{ my: 3, borderBottomWidth: 2 }} />

                        <ToggleButtonGroup
                            value={selection.phases}
                            onChange={(_, value: PuzzlePhase[]) =>
                                choose({ ...selection, phases: value })
                            }
                            aria-label='Phase of the game'
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 1.5,
                            }}
                        >
                            {PUZZLE_PHASES.map((option) => (
                                <ChoiceCard key={option} option={option} />
                            ))}
                        </ToggleButtonGroup>

                        <Autocomplete
                            sx={{ mt: 2 }}
                            options={options}
                            value={focus}
                            onChange={(_, value) => setFocus(value ?? ANYTHING)}
                            groupBy={(option) => option.group}
                            getOptionLabel={(option) => option.label}
                            // A theme listed under several buckets appears under each of them.
                            getOptionKey={(option) =>
                                `${option.group}|${option.kind}|${option.label}`
                            }
                            isOptionEqualToValue={(a, b) =>
                                a.kind === b.kind && a.label === b.label && a.group === b.group
                            }
                            disableClearable
                            // The menu is rounded like the cards, and each group of themes is headed
                            // by its bucket's color.
                            slotProps={{ paper: { sx: { borderRadius: '18px', mt: 0.5 } } }}
                            renderGroup={(params) => (
                                <li key={params.key}>
                                    <Typography
                                        sx={{
                                            px: 2,
                                            py: 0.75,
                                            fontWeight: 800,
                                            fontSize: '0.8rem',
                                            letterSpacing: 0.6,
                                            textTransform: 'uppercase',
                                            color: bucketColor(params.group),
                                            borderBottom: 1,
                                            borderColor: 'divider',
                                            position: 'sticky',
                                            top: 0,
                                            bgcolor: 'background.paper',
                                            zIndex: 1,
                                        }}
                                    >
                                        {params.group}
                                    </Typography>
                                    <ul style={{ padding: 0 }}>{params.children}</ul>
                                </li>
                            )}
                            renderOption={(props, option) => {
                                const { key, ...rest } = props as typeof props & { key: string };
                                return (
                                    <li key={key} {...rest}>
                                        <Typography
                                            sx={{
                                                fontWeight:
                                                    option.kind === 'any' ? 'bold' : undefined,
                                                pl: option.kind === 'theme' ? 2 : 0,
                                            }}
                                        >
                                            {option.label}
                                        </Typography>
                                    </li>
                                );
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label='Themes'
                                    slotProps={{
                                        ...params.slotProps,
                                        input: {
                                            ...params.slotProps.input,
                                            startAdornment: (
                                                <>
                                                    <InputAdornment position='start'>
                                                        <LocalOffer color='primary' />
                                                    </InputAdornment>
                                                    {params.slotProps.input.startAdornment}
                                                </>
                                            ),
                                        },
                                    }}
                                    sx={{
                                        // Rounded, tinted and edged like the cards above it.
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '18px',
                                            fontWeight: 700,
                                            fontSize: '1.1rem',
                                            py: 0.75,
                                            background: (theme) =>
                                                `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.06)})`,
                                            '& fieldset': {
                                                borderWidth: 2,
                                                borderColor: (theme) =>
                                                    alpha(theme.palette.primary.main, 0.5),
                                            },
                                            '&:hover fieldset, &.Mui-focused fieldset': {
                                                borderColor: 'primary.main',
                                            },
                                        },
                                    }}
                                />
                            )}
                        />

                        <Box>
                            <Typography
                                variant='overline'
                                sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                            >
                                Puzzle rating
                            </Typography>
                            <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                                {allRatings ? 'All ratings' : `${range[0]}–${range[1]}`}
                            </Typography>
                            <Slider
                                value={range}
                                onChange={(_, value) => setRange(value as [number, number])}
                                min={0}
                                max={RATING_SLIDER_MAX}
                                step={50}
                                disableSwap
                                valueLabelDisplay='auto'
                                getAriaLabel={(index) =>
                                    index === 0 ? 'Lowest puzzle rating' : 'Highest puzzle rating'
                                }
                            />
                            <Stack direction='row' sx={{ justifyContent: 'center', mt: 1 }}>
                                <ToggleButtonGroup
                                    exclusive
                                    size='small'
                                    value={allRatings ? 'all' : isAroundYou ? 'around' : null}
                                    onChange={(_, value: 'all' | 'around' | null) => {
                                        if (value === 'all') setRange(ALL_RATINGS);
                                        if (value === 'around') setRange(aroundYou);
                                    }}
                                    aria-label='Rating range'
                                    sx={CHOICE_SX}
                                >
                                    <ToggleButton value='all'>All ratings</ToggleButton>
                                    {userRating > 0 && (
                                        <ToggleButton value='around'>Around my rating</ToggleButton>
                                    )}
                                </ToggleButtonGroup>
                            </Stack>
                        </Box>

                        <Box>
                            <Typography
                                variant='overline'
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: 1.4,
                                    display: 'block',
                                    textAlign: 'center',
                                    mb: 1,
                                }}
                            >
                                Session length
                            </Typography>
                            <Stack direction='row' sx={{ justifyContent: 'center' }}>
                                <ToggleButtonGroup
                                    exclusive
                                    size='small'
                                    value={length}
                                    onChange={(_, value: SessionLength | null) =>
                                        value && setLength(value)
                                    }
                                    aria-label='Session length'
                                    sx={CHOICE_SX}
                                >
                                    {SESSION_MINUTES.map((minutes) => (
                                        <ToggleButton key={minutes} value={minutes}>
                                            {minutes} min
                                        </ToggleButton>
                                    ))}
                                    <ToggleButton value='unlimited'>Unlimited</ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>

                {message && <Alert severity='info'>{message}</Alert>}

                <Button
                    variant='contained'
                    size='large'
                    startIcon={<PlayArrow />}
                    disabled={loading}
                    onClick={start}
                    sx={{
                        py: 1.75,
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        borderRadius: '14px',
                        // Black with white writing, an orange edge and an orange icon: it stands out
                        // without glaring.
                        bgcolor: START_PAPER,
                        color: START_INK,
                        border: `2px solid ${ORANGE}`,
                        boxShadow: `0 6px 18px ${alpha(ORANGE, 0.3)}`,
                        '& .MuiButton-startIcon svg': { color: ORANGE, fontSize: '1.8rem' },
                        '&:hover': {
                            // A deeper orange than the edge, so it fills in without glaring.
                            bgcolor: ORANGE_DEEP,
                            borderColor: ORANGE_DEEP,
                            color: '#fff',
                            boxShadow: `0 8px 22px ${alpha(ORANGE_DEEP, 0.4)}`,
                            '& .MuiButton-startIcon svg': { color: '#fff' },
                        },
                        '&.Mui-disabled': {
                            bgcolor: alpha(START_PAPER, 0.6),
                            color: alpha(START_INK, 0.6),
                        },
                    }}
                >
                    {loading ? 'Finding puzzles…' : 'Start Training'}
                </Button>
                <Button
                    component={Link}
                    href='/puzzles/train/history'
                    color='inherit'
                    startIcon={<History />}
                    sx={{ alignSelf: 'center' }}
                >
                    View past runs
                </Button>
            </Stack>
        </Container>
    );
}

/** Fine film grain, the same on every card, as a tiled picture made of noise. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.28 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}") 0 0 / 140px 140px`;

/**
 * The surface of a card: fine grain, like paper, under one soft touch of light that is different on
 * each card and suits it. Nothing sharp or repeating, so it never plays tricks on the eye.
 * @param strength How visible it is, from the resting 1 to a little more for hover and selection.
 */
function texture(option: PuzzleType | PuzzlePhase, strength: number): string {
    const light = (a: number) => `rgba(255, 255, 255, ${a * strength})`;
    const accent = {
        // A streak of light slanting across, like polished metal.
        Tactics: `linear-gradient(115deg, transparent 28%, ${light(0.06)} 46%, transparent 64%)`,
        // A soft sheen across the top, like a lit desk.
        Strategy: `linear-gradient(180deg, ${light(0.05)}, transparent 55%)`,
        // Light rising from the bottom edge, like dawn.
        Opening: `radial-gradient(ellipse at 50% 115%, ${light(0.06)}, transparent 62%)`,
        // A soft glow in the middle, like the heat of the fight.
        Middlegame: `radial-gradient(circle at 50% 50%, ${light(0.04)}, transparent 62%)`,
        // A soft pool of light at the top corner, like the end of the day.
        Endgame: `radial-gradient(circle at 100% 0%, ${light(0.055)}, transparent 60%)`,
    }[option];
    return `${GRAIN}, ${accent}`;
}

/** One big card: a type of puzzle or a phase of the game. Picked cards fill with their color. */
function ChoiceCard({ option, wide }: { option: PuzzleType | PuzzlePhase; wide?: boolean }) {
    const { color, icon } = CHOICE_STYLE[option];
    return (
        <ToggleButton
            value={option}
            sx={{
                // The group squares off its buttons; this makes them separate, rounded cards.
                // The doubled & wins over the group's own rules.
                '&&': {
                    m: 0,
                    borderRadius: '18px',
                    border: '2px solid',
                    borderColor: alpha(color, 0.55),
                },
                aspectRatio: wide ? '1.7 / 1' : '1.1 / 1',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1,
                textAlign: 'center',
                textTransform: 'none',
                color: 'text.primary',
                fontSize: wide ? { xs: '1.35rem', sm: '1.75rem' } : { xs: '1rem', sm: '1.3rem' },
                fontWeight: 800,
                letterSpacing: 0.3,
                lineHeight: 1.1,
                // Colored even when not picked: a tint that fades down.
                background: `${texture(option, 1)}, linear-gradient(160deg, ${alpha(color, 0.4)}, ${alpha(color, 0.14)})`,
                // A thin light edge along the top, like a raised tile.
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                transition: 'transform 150ms, box-shadow 150ms, background 150ms',
                '& > svg': {
                    color,
                    fontSize: wide
                        ? { xs: '2.75rem', sm: '3.5rem' }
                        : { xs: '2.25rem', sm: '2.75rem' },
                    filter: `drop-shadow(0 2px 4px ${alpha(color, 0.35)})`,
                },
                '&:hover': {
                    transform: 'translateY(-2px)',
                    background: `${texture(option, 1.3)}, linear-gradient(160deg, ${alpha(color, 0.52)}, ${alpha(color, 0.22)})`,
                },
                // Picked, the card fills with the color and lifts.
                '&.Mui-selected, &.Mui-selected:hover': {
                    background: `${texture(option, 1.8)}, linear-gradient(160deg, ${color}, ${darken(color, 0.28)})`,
                    color: '#fff',
                    transform: 'translateY(-3px)',
                    boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 10px 24px ${alpha(color, 0.45)}`,
                    '& > svg': { color: '#fff', filter: 'none' },
                },
            }}
        >
            {option}
            {icon}
        </ToggleButton>
    );
}
