import { EventType, trackEvent } from '@/analytics/events';
import { metaLead } from '@/analytics/meta';
import { anton } from '@/components/landing/fonts';
import { Link } from '@/components/navigation/Link';
import { fontFamily } from '@/style/font';
import { Check } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { getAttribution } from '../../class/classLead';
import {
    Body,
    Condensed,
    HAIRLINE,
    INK_RAISED,
    MUTED,
    ORANGE,
    scrollToOffer,
} from '../../class/sections/shared';
import {
    CHECKOUT_HINT,
    COUPON,
    FREE_ACCOUNTS_CAN_PLAY,
    JESSE_BEST,
    LEAD_CAPTURE,
    missesLabel,
    offerLabel,
} from '../content';
import { rushLeadSchema, submitRushLead } from '../rushLead';
import { bestSolved, RushDemoRun } from '../rushStorage';
import { CopyIcon, useCopyCode } from './CopyCode';
import { TopGround } from './Hero';
import { EASE_OUT, softIn, uncover } from './motion';
import {
    Display,
    primaryButtonSx,
    RunPips,
    secondaryButtonSx,
    SUCCESS,
    TOP_ACTION_ID,
} from './parts';
import { RunChart, ShareResult } from './RunReport';

type FormState = 'idle' | 'sending' | 'sent' | 'failed';

/** Shown once all three runs are done, in place of the hero. */
export function Unlock({
    runs,
    onReview,
}: {
    runs: RushDemoRun[];
    onReview: (missIndex?: number) => void;
}) {
    const best = bestSolved(runs);
    const lastRun = runs[runs.length - 1];
    const bestRun = runs.find((run) => run.solved === best) ?? lastRun;

    const onOffer = () => {
        trackEvent(EventType.RushDemoOfferClick, { placement: 'unlock' });
        scrollToOffer();
    };

    return (
        <TopGround>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 27rem)' },
                    columnGap: 8,
                    rowGap: 4,
                    alignItems: 'start',
                    mt: { xs: 3, md: 7 },
                }}
            >
                <Box>
                    <Box sx={{ mb: 2 }}>
                        <RunPips done={runs.length} />
                    </Box>
                    <Display>Three runs done. Your best: {best}.</Display>
                    {JESSE_BEST.confirmed && (
                        <Body sx={{ mt: 2, color: 'common.white', fontSize: '1.25rem' }}>
                            GM Jesse Kraai’s best is {JESSE_BEST.score}.
                        </Body>
                    )}

                    <RunsCompared runs={runs} best={best} />

                    {lastRun.misses.length > 0 && (
                        <Button
                            variant='outlined'
                            onClick={() => onReview()}
                            sx={{ ...secondaryButtonSx, mt: 3, minHeight: 48 }}
                        >
                            {missesLabel(lastRun.misses.length)}
                        </Button>
                    )}
                    <Box sx={{ mt: 1 }}>
                        <ShareResult run={bestRun} placement='unlock' />
                    </Box>
                    {FREE_ACCOUNTS_CAN_PLAY.confirmed && (
                        <Body sx={{ mt: 2.5 }}>
                            Out of runs here.{' '}
                            <Link href={FREE_ACCOUNTS_CAN_PLAY.signupHref}>
                                Create a free account to keep playing
                            </Link>
                            .
                        </Body>
                    )}
                </Box>

                <Box
                    id={TOP_ACTION_ID}
                    sx={{
                        p: { xs: 2.5, md: 3.5 },
                        bgcolor: INK_RAISED,
                        border: `1px solid rgba(247, 148, 31, 0.5)`,
                        borderRadius: 3,
                        boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                    }}
                >
                    {COUPON.confirmed ? (
                        <>
                            {/* The code and the way to use it come first. The email is a courtesy. */}
                            <CodeReveal />
                            <Button
                                fullWidth
                                variant='contained'
                                color='dojoOrange'
                                size='large'
                                onClick={onOffer}
                                sx={{
                                    ...primaryButtonSx,
                                    mt: 2.5,
                                    animation: `${softIn} 420ms ${EASE_OUT} 520ms both`,
                                }}
                            >
                                {offerLabel()}
                            </Button>
                            {LEAD_CAPTURE.ready && (
                                <Box
                                    sx={{
                                        mt: 3,
                                        pt: 3,
                                        borderTop: `1px solid ${HAIRLINE}`,
                                        animation: `${softIn} 420ms ${EASE_OUT} 600ms both`,
                                    }}
                                >
                                    <CodeForm runs={runs} />
                                </Box>
                            )}
                        </>
                    ) : (
                        <>
                            <CodeForm runs={runs} />
                            <Button
                                fullWidth
                                variant='outlined'
                                color='inherit'
                                size='large'
                                onClick={onOffer}
                                sx={{ ...secondaryButtonSx, mt: 2 }}
                            >
                                {offerLabel()}
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </TopGround>
    );
}

/** The three runs next to each other, each as its own small chart, with the best one lit. */
function RunsCompared({ runs, best }: { runs: RushDemoRun[]; best: number }) {
    return (
        <Box
            component='ul'
            aria-label='Your runs'
            sx={{
                m: 0,
                mt: 3,
                p: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: { xs: 1.5, md: 2.5 },
                maxWidth: '34rem',
            }}
        >
            {runs.map((run, index) => {
                const isBest = run.solved === best;
                return (
                    <Box
                        key={run.finishedAt + String(index)}
                        component='li'
                        sx={{
                            listStyle: 'none',
                            animation: `${softIn} 480ms ${EASE_OUT} ${index * 70}ms both`,
                        }}
                    >
                        <Box sx={{ opacity: isBest ? 1 : 0.6 }}>
                            <RunChart run={run} compact />
                        </Box>
                        <Stack direction='row' sx={{ mt: 0.75, alignItems: 'baseline', gap: 0.75 }}>
                            <Condensed
                                sx={{
                                    fontSize: '1.9rem',
                                    color: isBest ? ORANGE : 'common.white',
                                }}
                            >
                                {run.solved}
                            </Condensed>
                            <Typography variant='body2' sx={{ color: MUTED }}>
                                Run {index + 1}
                            </Typography>
                        </Stack>
                    </Box>
                );
            })}
        </Box>
    );
}

/** The code itself. Rendered only once the coupon is confirmed. */
function CodeReveal() {
    const { copied, copy } = useCopyCode('unlock');

    return (
        <Box>
            <Condensed
                component='h2'
                sx={{
                    fontSize: { xs: '1.7rem', md: '1.9rem' },
                    fontWeight: 500,
                    animation: `${softIn} 420ms ${EASE_OUT} 120ms both`,
                }}
            >
                Here is your {COUPON.percentOff}% off
            </Condensed>
            <Stack
                direction='row'
                sx={{
                    mt: 1.5,
                    gap: 1.5,
                    alignItems: 'stretch',
                    animation: `${softIn} 420ms ${EASE_OUT} 200ms both`,
                }}
            >
                <Box
                    sx={{
                        flexGrow: 1,
                        display: 'grid',
                        placeItems: 'center',
                        minHeight: 60,
                        borderRadius: 2,
                        border: `2px dashed ${copied ? SUCCESS : ORANGE}`,
                        bgcolor: 'rgba(247, 148, 31, 0.08)',
                        transition: 'border-color 200ms ease',
                    }}
                >
                    <Box
                        component='span'
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, anton),
                            fontSize: { xs: '1.75rem', md: '2rem' },
                            lineHeight: 1,
                            letterSpacing: '0.08em',
                            // The one moment of the page that is seen once: the code is uncovered.
                            animation: `${uncover} 700ms cubic-bezier(0.77, 0, 0.175, 1) 380ms both`,
                        }}
                    >
                        {COUPON.code}
                    </Box>
                </Box>
                <Button
                    variant='outlined'
                    onClick={copy}
                    startIcon={<CopyIcon copied={copied} />}
                    sx={{ ...secondaryButtonSx, minHeight: 60, whiteSpace: 'nowrap' }}
                >
                    {copied ? 'Copied' : 'Copy code'}
                </Button>
            </Stack>
            <Typography
                variant='body2'
                sx={{ mt: 1.5, color: MUTED, animation: `${softIn} 420ms ${EASE_OUT} 440ms both` }}
            >
                {[COUPON.terms, CHECKOUT_HINT].filter(Boolean).join(' ')}
            </Typography>
        </Box>
    );
}

/** Collects the email the code goes to. */
function CodeForm({ runs }: { runs: RushDemoRun[] }) {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [errors, setErrors] = useState<{ email?: string; consent?: string }>({});
    const [state, setState] = useState<FormState>('idle');
    const [started, setStarted] = useState(false);

    const onFocus = () => {
        if (!started) {
            setStarted(true);
            trackEvent(EventType.RushDemoLeadStart);
        }
    };

    const onSubmit = async (event: { preventDefault: () => void }) => {
        event.preventDefault();
        const lead = {
            email: email.trim(),
            consent,
            bestScore: bestSolved(runs),
            scores: runs.map((run) => run.solved),
            attribution: getAttribution(),
            website,
        };
        const parsed = rushLeadSchema.safeParse(lead);
        if (!parsed.success) {
            const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
            setErrors({
                email: fields.has('email') ? 'Enter a valid email address.' : undefined,
                consent: fields.has('consent')
                    ? 'Tick the box so we can email you the code.'
                    : undefined,
            });
            return;
        }

        setErrors({});
        setState('sending');
        const stored = await submitRushLead(parsed.data);
        if (!stored) {
            setState('failed');
            return;
        }
        metaLead();
        trackEvent(EventType.RushDemoLead, { best_score: lead.bestScore });
        setState('sent');
    };

    if (state === 'sent') {
        return (
            <Stack role='status' direction='row' sx={{ gap: 1.5, alignItems: 'flex-start' }}>
                <Check sx={{ color: SUCCESS, mt: 0.25 }} />
                <Box>
                    <Condensed component='h2' sx={{ fontSize: '1.6rem', fontWeight: 500 }}>
                        {COUPON.confirmed ? 'Sent.' : 'Got it.'}
                    </Condensed>
                    <Body sx={{ mt: 0.5, color: 'common.white' }}>
                        Your {COUPON.percentOff}% code is on its way to {email.trim()}.
                    </Body>
                </Box>
            </Stack>
        );
    }

    return (
        <Stack
            component='form'
            noValidate
            onSubmit={(event) => void onSubmit(event)}
            sx={{ gap: 2 }}
        >
            {COUPON.confirmed ? (
                <Body sx={{ color: 'common.white' }}>Want it in your inbox too?</Body>
            ) : (
                <Box>
                    <Condensed
                        component='h2'
                        sx={{ fontSize: { xs: '1.7rem', md: '1.9rem' }, fontWeight: 500 }}
                    >
                        Your {COUPON.percentOff}% off is unlocked.
                    </Condensed>
                    <Body sx={{ mt: 0.75, color: 'common.white' }}>
                        Tell us where to send the code.
                    </Body>
                </Box>
            )}

            <TextField
                required
                type='email'
                label='Your email'
                autoComplete='email'
                value={email}
                onFocus={onFocus}
                onChange={(event) => setEmail(event.target.value)}
                error={!!errors.email}
                helperText={errors.email}
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
                    sx={{ alignItems: 'flex-start', m: 0 }}
                    control={
                        <Checkbox
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                            sx={{ p: 0, pr: 1, color: 'rgba(255,255,255,0.7)' }}
                        />
                    }
                    label={
                        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.82)' }}>
                            Email me the code and a few ChessDojo emails about training. Unsubscribe
                            in one click. See the{' '}
                            <Link href='/privacy-policy' target='_blank'>
                                privacy policy
                            </Link>
                            .
                        </Typography>
                    }
                />
                {errors.consent && (
                    <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                        {errors.consent}
                    </Typography>
                )}
            </Box>

            <Button
                type='submit'
                variant={COUPON.confirmed ? 'outlined' : 'contained'}
                color={COUPON.confirmed ? 'inherit' : 'dojoOrange'}
                size='large'
                loading={state === 'sending'}
                sx={COUPON.confirmed ? secondaryButtonSx : primaryButtonSx}
            >
                {COUPON.confirmed ? 'Email me the code' : 'Send my code'}
            </Button>
            {state === 'failed' && (
                <Typography role='alert' variant='body2' sx={{ color: '#FF8A7A' }}>
                    We could not save your email just now. Give it a minute and try again.
                </Typography>
            )}
        </Stack>
    );
}
