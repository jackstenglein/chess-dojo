'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { metaLead } from '@/analytics/meta';
import { Link } from '@/components/navigation/Link';
import { Add, ArrowBack, Remove } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { getAttribution } from '../../class/classLead';
import {
    Body,
    Condensed,
    EASE_OUT,
    fadeIn,
    HAIRLINE,
    INK_RAISED,
    MUTED,
    ORANGE,
} from '../../class/sections/shared';
import { MATCH, PLAYERS } from '../config';
import { FLOW, QUESTIONS, SCORE_OPTIONS, TIEBREAK_OPTIONS } from '../content';
import { useStoredDraft } from '../hooks';
import {
    DECISIVE_SCORES,
    decisiveOptions,
    describePicks,
    Draft,
    findConflict,
    firstDecisiveOptions,
    isAnswered,
    MAX_DISPLAY_NAME,
    MAX_GAME_1_MOVES,
    saveDraft,
    saveEntry,
    scoreOf,
    StepId,
    stepsFor,
    TIED_SCORE,
    toPicks,
    wcPredictionSchema,
} from '../prediction';
import { submitEntry } from '../submitEntry';
import { MatchStripWithSummary } from './MatchStrip';
import { Versus } from './Versus';

export const FLOW_ELEMENT_ID = 'picks';
const DEFAULT_GAME_1_MOVES = 40;
const ADVANCE_DELAY_MS = 180;
/** The first pick gets a little longer, so the chosen side can finish filling in. */
const WINNER_ADVANCE_DELAY_MS = 420;
const PICK_NUMBERS: Partial<Record<StepId, number>> = {
    winner: 1,
    tiebreaks: 2,
    score: 3,
    decisive: 4,
    first: 5,
};

export function scrollToFlow() {
    const flow = document.getElementById(FLOW_ELEMENT_ID);
    flow?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    flow?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
}

function optionSx(selected: boolean) {
    return {
        minHeight: 56,
        px: 2,
        py: 1.25,
        font: 'inherit',
        textAlign: 'left',
        color: 'common.white',
        cursor: 'pointer',
        borderRadius: 2,
        bgcolor: selected ? 'rgba(247, 148, 31, 0.16)' : 'rgba(255, 255, 255, 0.045)',
        border: `2px solid ${selected ? ORANGE : HAIRLINE}`,
        transition: `border-color 200ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}, transform 150ms ${EASE_OUT}`,
        '@media (hover: hover) and (pointer: fine)': {
            '&:hover:not(:disabled)': {
                borderColor: selected ? ORANGE : 'rgba(255, 255, 255, 0.45)',
            },
        },
        '&:active:not(:disabled)': { transform: 'scale(0.97)' },
        '&:disabled': { opacity: 0.28, cursor: 'not-allowed' },
    } as const;
}

function Option({
    selected,
    disabled,
    onSelect,
    label,
    children,
    sx,
}: {
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
    label?: string;
    children: ReactNode;
    sx?: Record<string, string | number | object | undefined>;
}) {
    return (
        <Box
            component='button'
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={label}
            disabled={disabled}
            onClick={onSelect}
            sx={{ ...optionSx(selected), ...sx }}
        >
            {children}
        </Box>
    );
}

function NumberGrid({
    label,
    values,
    allowed,
    selected,
    onSelect,
}: {
    label: string;
    values: (number | 'none')[];
    allowed: (number | 'none')[];
    selected: number | 'none' | undefined;
    onSelect: (value: number | 'none') => void;
}) {
    return (
        <Box
            role='radiogroup'
            aria-label={label}
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}
        >
            {values.map((value) => (
                <Option
                    key={value}
                    selected={selected === value}
                    disabled={!allowed.includes(value)}
                    onSelect={() => onSelect(value)}
                    sx={{
                        minHeight: 52,
                        px: 0,
                        py: 0,
                        textAlign: 'center',
                        fontSize: value === 'none' ? '1rem' : '1.25rem',
                        fontWeight: 600,
                    }}
                >
                    {value === 'none' ? FLOW.noneOption : value}
                </Option>
            ))}
        </Box>
    );
}

export function PickFlow({ onClosed }: { onClosed: () => void }) {
    // The picks live in the browser's storage, so a reload picks up where the visitor stopped.
    const { picks: draft, step, started } = useStoredDraft();
    const [movesInput, setMovesInput] = useState<string>();
    const [movesError, setMovesError] = useState(false);

    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [errors, setErrors] = useState<{ email?: string; consent?: string; form?: string }>({});
    const [loading, setLoading] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const advanceTimer = useRef<number>(undefined);
    const movedByVisitor = useRef(false);

    useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

    // Keeps the question in view and tells screen readers that it changed.
    useEffect(() => {
        if (!movedByVisitor.current) {
            return;
        }
        movedByVisitor.current = false;
        const card = cardRef.current;
        if (card && card.getBoundingClientRect().top < 0) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        titleRef.current?.focus({ preventScroll: true });
    }, [step]);

    const steps = stepsFor(draft);
    const stepIndex = Math.max(0, steps.indexOf(step));
    const conflict = findConflict(draft);
    const blocked = conflict?.step === step;
    const score = scoreOf(draft);

    const goTo = (next: StepId, picks: Draft = draft) => {
        movedByVisitor.current = true;
        saveDraft({ picks, step: next, started: true });
    };

    const goNext = (picks: Draft = draft) => {
        const order = stepsFor(picks);
        const next = order[order.indexOf(step) + 1] ?? 'email';
        // Nobody reaches the email step with picks that cannot all come true.
        const problem = next === 'email' ? findConflict(picks) : undefined;
        goTo(problem ? problem.step : next, picks);
    };

    const goBack = () => {
        window.clearTimeout(advanceTimer.current);
        const previous = steps[stepIndex - 1];
        if (previous) {
            goTo(previous);
        }
    };

    const answer = (change: Draft) => {
        const picks = { ...draft, ...change };
        if (!started) {
            trackEvent(EventType.WcPickStart);
        }
        saveDraft({ picks, step, started: true });
        if (findConflict(picks)?.step === step) {
            return;
        }
        trackEvent(EventType.WcPickStep, { step: stepIndex + 1, step_id: step });
        window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(
            () => goNext(picks),
            step === 'winner' ? WINNER_ADVANCE_DELAY_MS : ADVANCE_DELAY_MS,
        );
    };

    const movesText = movesInput ?? String(draft.game1Moves ?? DEFAULT_GAME_1_MOVES);
    const moves = Number(movesText);
    const movesValid = Number.isInteger(moves) && moves >= 1 && moves <= MAX_GAME_1_MOVES;

    const nudgeMoves = (delta: number) => {
        const base = movesValid ? moves : DEFAULT_GAME_1_MOVES;
        setMovesInput(String(Math.min(MAX_GAME_1_MOVES, Math.max(1, base + delta))));
        setMovesError(false);
    };

    const confirmMoves = () => {
        if (!movesValid) {
            setMovesError(true);
            return;
        }
        trackEvent(EventType.WcPickStep, { step: stepIndex + 1, step_id: step });
        goNext({ ...draft, game1Moves: moves });
    };

    const onSubmit = async (event: { preventDefault: () => void }) => {
        event.preventDefault();
        const picks = toPicks(draft);
        if (!picks) {
            goTo(stepsFor(draft).find((item) => !isAnswered(draft, item)) ?? 'winner');
            return;
        }

        const entry = {
            kind: 'prediction' as const,
            email: email.trim(),
            displayName: displayName.trim() || undefined,
            consent,
            picks,
            attribution: getAttribution(),
            website,
        };
        const parsed = wcPredictionSchema.safeParse(entry);
        if (!parsed.success) {
            const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
            if (fields.has('picks')) {
                goTo(findConflict(draft)?.step ?? 'winner');
                return;
            }
            setErrors({
                email: fields.has('email') ? FLOW.email.emailError : undefined,
                consent: fields.has('consent') ? FLOW.email.consentError : undefined,
            });
            return;
        }

        setErrors({});
        setLoading(true);
        const outcome = await submitEntry(parsed.data);
        setLoading(false);

        if (outcome === 'closed') {
            setErrors({ form: FLOW.email.closedError });
            onClosed();
            return;
        }
        if (outcome === 'duplicate') {
            setErrors({ form: FLOW.email.duplicateError });
            return;
        }
        // "Your picks are in" has to be true, so a failed save keeps the visitor here.
        if (outcome === 'failed') {
            setErrors({ form: FLOW.email.saveError });
            return;
        }

        metaLead();
        trackEvent(EventType.WcPredictionSubmit, { winner: picks.winner, score: picks.score });
        saveEntry({
            picks,
            displayName: entry.displayName ?? '',
            submittedAt: new Date().toISOString(),
        });
    };

    const pickNumber = PICK_NUMBERS[step];
    const stepLabel = pickNumber
        ? FLOW.pickLabel(pickNumber)
        : step === 'moves'
          ? FLOW.tieBreakerLabel
          : FLOW.lastStepLabel;
    const question = step === 'email' ? undefined : QUESTIONS[step];
    const title = question?.title ?? FLOW.email.title;
    const completePicks = toPicks(draft);

    const decisiveAllowed = decisiveOptions(score);
    const firstAllowed = firstDecisiveOptions(score, draft.decisiveGames);
    const gameNumbers = Array.from({ length: MATCH.games }, (_, index) => index + 1);
    const someGreyedOut =
        (step === 'decisive' && decisiveAllowed.length <= MATCH.games) ||
        (step === 'first' && firstAllowed.length <= MATCH.games);
    const showNext = step !== 'email' && (step === 'moves' || isAnswered(draft, step));

    return (
        <Box
            ref={cardRef}
            id={FLOW_ELEMENT_ID}
            component='section'
            aria-label={`${stepLabel}. ${title}`}
            sx={{
                scrollMarginTop: '1rem',
                bgcolor: INK_RAISED,
                borderRadius: 3,
                border: `1px solid ${HAIRLINE}`,
                boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                overflow: 'hidden',
            }}
        >
            <Box
                role='progressbar'
                aria-label='Progress through your picks'
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={stepIndex}
                sx={{ height: 4, bgcolor: 'rgba(255, 255, 255, 0.08)' }}
            >
                <Box
                    sx={{
                        height: 1,
                        bgcolor: ORANGE,
                        transformOrigin: 'left',
                        transform: `scaleX(${(stepIndex + 1) / steps.length})`,
                        transition: `transform 400ms ${EASE_OUT}`,
                    }}
                />
            </Box>

            <Box sx={{ p: { xs: 2.25, sm: 3 } }}>
                <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}
                >
                    <Condensed
                        sx={{
                            color: ORANGE,
                            fontSize: '1rem',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {stepLabel}
                    </Condensed>
                    {question && pickNumber && (
                        <Typography variant='body2' sx={{ color: MUTED, textAlign: 'right' }}>
                            {question.points}
                        </Typography>
                    )}
                </Stack>

                <Box key={step} sx={{ animation: `${fadeIn} 260ms ${EASE_OUT} both` }}>
                    <Condensed
                        component='h2'
                        sx={{
                            mt: 0.75,
                            fontSize: { xs: '1.65rem', sm: '1.9rem' },
                            lineHeight: 1.1,
                            textWrap: 'balance',
                            outline: 'none',
                        }}
                    >
                        <span ref={titleRef} tabIndex={-1} style={{ outline: 'none' }}>
                            {title}
                        </span>
                    </Condensed>
                    {question?.help && (
                        <Body sx={{ mt: 0.75, fontSize: '1rem', lineHeight: 1.4 }}>
                            {step === 'decisive' && draft.tiebreaks
                                ? `Your tiebreak pick sets the classical score at ${TIED_SCORE}. ${question.help}`
                                : question.help}
                        </Body>
                    )}

                    <Box sx={{ mt: 2 }}>
                        {step === 'winner' && (
                            <Versus
                                label={title}
                                selected={draft.winner}
                                onSelect={(player) => answer({ winner: player })}
                            />
                        )}

                        {step === 'tiebreaks' && (
                            <Stack role='radiogroup' aria-label={title} sx={{ gap: 1.25 }}>
                                <Option
                                    selected={draft.tiebreaks === false}
                                    onSelect={() => answer({ tiebreaks: false })}
                                >
                                    <Condensed sx={{ fontSize: '1.3rem' }}>
                                        {TIEBREAK_OPTIONS.classical}
                                    </Condensed>
                                </Option>
                                <Option
                                    selected={draft.tiebreaks === true}
                                    onSelect={() => answer({ tiebreaks: true })}
                                >
                                    <Condensed sx={{ fontSize: '1.3rem' }}>
                                        {TIEBREAK_OPTIONS.tiebreaks}
                                    </Condensed>
                                </Option>
                            </Stack>
                        )}

                        {step === 'score' && (
                            <Stack role='radiogroup' aria-label={title} sx={{ gap: 1 }}>
                                {DECISIVE_SCORES.map((option) => (
                                    <Option
                                        key={option}
                                        selected={draft.score === option}
                                        onSelect={() => answer({ score: option })}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline',
                                            gap: 2,
                                        }}
                                    >
                                        <Condensed component='span' sx={{ fontSize: '1.35rem' }}>
                                            {draft.winner ? `${PLAYERS[draft.winner].name} ` : ''}
                                            {SCORE_OPTIONS[option].label}
                                        </Condensed>
                                        <Typography
                                            component='span'
                                            variant='body2'
                                            sx={{ color: MUTED, textAlign: 'right' }}
                                        >
                                            {SCORE_OPTIONS[option].detail}
                                        </Typography>
                                    </Option>
                                ))}
                            </Stack>
                        )}

                        {step === 'decisive' && (
                            <NumberGrid
                                label={title}
                                values={[0, ...gameNumbers]}
                                allowed={decisiveAllowed}
                                selected={draft.decisiveGames}
                                onSelect={(value) => answer({ decisiveGames: Number(value) })}
                            />
                        )}

                        {step === 'first' && (
                            <NumberGrid
                                label={title}
                                values={[...gameNumbers, 'none']}
                                allowed={firstAllowed}
                                selected={draft.firstDecisiveGame}
                                onSelect={(value) => answer({ firstDecisiveGame: value })}
                            />
                        )}

                        {(step === 'decisive' || step === 'first') && someGreyedOut && !blocked && (
                            <Typography variant='body2' sx={{ mt: 1.25, color: MUTED }}>
                                {FLOW.greyedOut}
                            </Typography>
                        )}

                        {step === 'moves' && (
                            <Box>
                                <Stack
                                    direction='row'
                                    sx={{ alignItems: 'center', justifyContent: 'center', gap: 1 }}
                                >
                                    <IconButton
                                        aria-label='Five moves fewer'
                                        onClick={() => nudgeMoves(-5)}
                                        sx={stepperSx}
                                    >
                                        <Typography
                                            component='span'
                                            variant='body2'
                                            sx={{ fontWeight: 600, fontSize: '1rem' }}
                                        >
                                            −5
                                        </Typography>
                                    </IconButton>
                                    <IconButton
                                        aria-label='One move fewer'
                                        onClick={() => nudgeMoves(-1)}
                                        sx={stepperSx}
                                    >
                                        <Remove />
                                    </IconButton>
                                    <TextField
                                        value={movesText}
                                        onChange={(event) => {
                                            setMovesInput(
                                                event.target.value.replace(/\D/g, '').slice(0, 3),
                                            );
                                            setMovesError(false);
                                        }}
                                        error={movesError}
                                        slotProps={{
                                            htmlInput: {
                                                inputMode: 'numeric',
                                                'aria-label': `${title} (1 to ${MAX_GAME_1_MOVES})`,
                                                style: {
                                                    textAlign: 'center',
                                                    fontSize: '1.9rem',
                                                    fontWeight: 600,
                                                    padding: '10px 0',
                                                },
                                            },
                                        }}
                                        sx={{ width: '5.25rem', flexShrink: 0 }}
                                    />
                                    <IconButton
                                        aria-label='One move more'
                                        onClick={() => nudgeMoves(1)}
                                        sx={stepperSx}
                                    >
                                        <Add />
                                    </IconButton>
                                    <IconButton
                                        aria-label='Five moves more'
                                        onClick={() => nudgeMoves(5)}
                                        sx={stepperSx}
                                    >
                                        <Typography
                                            component='span'
                                            variant='body2'
                                            sx={{ fontWeight: 600, fontSize: '1rem' }}
                                        >
                                            +5
                                        </Typography>
                                    </IconButton>
                                </Stack>
                                <Typography
                                    variant='body2'
                                    role={movesError ? 'alert' : undefined}
                                    sx={{
                                        mt: 1,
                                        textAlign: 'center',
                                        color: movesError ? 'error.main' : MUTED,
                                    }}
                                >
                                    {movesError ? FLOW.movesError : FLOW.movesUnit}
                                </Typography>
                            </Box>
                        )}

                        {step === 'email' && (
                            <Stack
                                component='form'
                                noValidate
                                onSubmit={(event) => void onSubmit(event)}
                                sx={{ gap: 1.75 }}
                            >
                                {completePicks && (
                                    <Typography variant='body2' sx={{ color: MUTED }}>
                                        {describePicks(completePicks)
                                            .map((line) => line.value)
                                            .join(' · ')}
                                    </Typography>
                                )}
                                <TextField
                                    required
                                    type='email'
                                    label={FLOW.email.emailLabel}
                                    autoComplete='email'
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                />
                                <TextField
                                    label={FLOW.email.nameLabel}
                                    autoComplete='nickname'
                                    value={displayName}
                                    onChange={(event) =>
                                        setDisplayName(
                                            event.target.value.slice(0, MAX_DISPLAY_NAME),
                                        )
                                    }
                                />
                                <Box
                                    component='input'
                                    aria-hidden
                                    tabIndex={-1}
                                    autoComplete='off'
                                    name='website'
                                    value={website}
                                    onChange={(event) => setWebsite(event.target.value)}
                                    sx={{ position: 'absolute', left: '-9999px', opacity: 0 }}
                                />
                                <Box>
                                    <FormControlLabel
                                        sx={{ alignItems: 'flex-start', m: 0, minHeight: 44 }}
                                        control={
                                            <Checkbox
                                                checked={consent}
                                                onChange={(event) =>
                                                    setConsent(event.target.checked)
                                                }
                                                sx={{ p: 0, pr: 1, color: 'rgba(255,255,255,0.7)' }}
                                            />
                                        }
                                        label={
                                            <Typography
                                                variant='body2'
                                                sx={{ color: 'rgba(255,255,255,0.85)' }}
                                            >
                                                {FLOW.email.consent} See the{' '}
                                                <Link href='/privacy-policy' target='_blank'>
                                                    privacy policy
                                                </Link>
                                                .
                                            </Typography>
                                        }
                                    />
                                    {errors.consent && (
                                        <Typography
                                            variant='caption'
                                            color='error'
                                            sx={{ display: 'block', mt: 0.5 }}
                                        >
                                            {errors.consent}
                                        </Typography>
                                    )}
                                </Box>
                                {errors.form && (
                                    <Typography role='alert' variant='body2' color='error'>
                                        {errors.form}
                                    </Typography>
                                )}
                                <Typography
                                    variant='body2'
                                    sx={{ color: 'rgba(255,255,255,0.85)', mb: -0.5 }}
                                >
                                    {FLOW.email.finalNote}
                                </Typography>
                                <Button
                                    type='submit'
                                    variant='contained'
                                    color='dojoOrange'
                                    size='large'
                                    loading={loading}
                                    sx={{ fontWeight: 600, fontSize: '1.1rem', minHeight: 56 }}
                                >
                                    {FLOW.email.submit}
                                </Button>
                            </Stack>
                        )}
                    </Box>

                    {step !== 'winner' && draft.winner && (
                        <Box sx={{ mt: 2.25, pt: 2, borderTop: `1px solid ${HAIRLINE}` }}>
                            <MatchStripWithSummary draft={draft} />
                        </Box>
                    )}

                    {blocked && conflict && (
                        <Typography
                            role='alert'
                            variant='body2'
                            sx={{
                                mt: 1.5,
                                p: 1.5,
                                borderRadius: 2,
                                color: 'common.white',
                                fontSize: '1rem',
                                bgcolor: 'rgba(247, 148, 31, 0.14)',
                                border: `1px solid rgba(247, 148, 31, 0.5)`,
                            }}
                        >
                            {conflict.message}
                        </Typography>
                    )}
                </Box>

                {(stepIndex > 0 || showNext) && (
                    <Stack
                        direction='row'
                        sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        {stepIndex > 0 ? (
                            <Button
                                onClick={goBack}
                                startIcon={<ArrowBack />}
                                sx={{ color: MUTED, minHeight: 44, px: 1.5, ml: -1.5 }}
                            >
                                {FLOW.back}
                            </Button>
                        ) : (
                            <span />
                        )}
                        {showNext && (
                            <Button
                                variant='contained'
                                color='dojoOrange'
                                disabled={blocked}
                                onClick={() => (step === 'moves' ? confirmMoves() : goNext())}
                                sx={{ minHeight: 48, px: 4, fontWeight: 600 }}
                            >
                                {FLOW.next}
                            </Button>
                        )}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

const stepperSx = {
    width: 44,
    height: 44,
    flexShrink: 0,
    color: 'common.white',
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 2,
    transition: `transform 150ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}`,
    '&:active': { transform: 'scale(0.97)' },
} as const;
