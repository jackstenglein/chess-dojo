'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { metaLead } from '@/analytics/meta';
import { anton, barlowCondensed } from '@/components/landing/fonts';
import { Link } from '@/components/navigation/Link';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { CheckCircle } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Container,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { ReactNode, useState } from 'react';
import { getAttribution } from '../../class/classLead';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    INK,
    INK_RAISED,
    MUTED,
    ORANGE,
    riseIn,
} from '../../class/sections/shared';
import { ContestConfig, OFFER_OPTIONS, OfferStatus, PLAYERS, Results } from '../config';
import { CONFIRMATION, FINISHED, HERO, LIVE, sentences } from '../content';
import { useResultsSignup, useTimeLeft } from '../hooks';
import {
    formatCountdown,
    formatLockMoment,
    reopenEntry,
    saveResultsSignup,
    scorePicks,
    StoredEntry,
    wcResultsSignupSchema,
} from '../prediction';
import { submitEntry } from '../submitEntry';
import { OFFER_ELEMENT_ID } from './BlackFriday';
import { clipSx, Flag } from './Motif';
import { PickFlow } from './PickFlow';
import { PicksCard, ShareButtons } from './PicksCard';

/** The picks card lands like a stamp, the one celebration on the page. */
const stampIn = keyframes`
    from { opacity: 0; transform: scale(1.06); filter: blur(6px); }
    to { opacity: 1; transform: scale(1); filter: blur(0); }
`;

function entranceSx(delayMs: number) {
    return { animation: `${riseIn} 800ms ${EASE_OUT} ${delayMs}ms both` };
}

function HeroFrame({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                position: 'relative',
                ...clipSx,
                isolation: 'isolate',
                background: `linear-gradient(180deg, #11111D 0%, ${INK} 100%)`,
            }}
        >
            {/* The event line runs across the top like a broadcast strap. */}
            <Condensed
                sx={{
                    px: 2,
                    py: 0.75,
                    textAlign: 'center',
                    color: '#0b0b12',
                    bgcolor: ORANGE,
                    fontSize: { xs: '0.8rem', sm: '0.95rem' },
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textWrap: 'balance',
                }}
            >
                {HERO.eyebrow}
            </Condensed>

            {/* A board running away from the viewer, under everything else. */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    zIndex: -1,
                    left: '-30%',
                    right: '-30%',
                    bottom: 0,
                    height: { xs: '46%', md: '62%' },
                    pointerEvents: 'none',
                    backgroundImage:
                        'conic-gradient(rgba(255, 255, 255, 0.07) 25%, transparent 0 50%, rgba(255, 255, 255, 0.07) 0 75%, transparent 0)',
                    backgroundSize: { xs: '96px 96px', md: '150px 150px' },
                    backgroundPosition: '50% 100%',
                    transform: 'perspective(620px) rotateX(58deg)',
                    transformOrigin: '50% 100%',
                    maskImage: 'linear-gradient(to top, #000 0%, transparent 92%)',
                }}
            />

            <Container maxWidth='lg' sx={{ pt: { xs: 1.5, md: 2 }, pb: { xs: 5, md: 9 } }}>
                <Stack
                    component={Link}
                    href='/'
                    direction='row'
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        minHeight: 44,
                        color: 'common.white',
                        textDecoration: 'none',
                    }}
                >
                    <ChessDojoIcon sx={{ fontSize: '2.25rem' }} />
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontWeight: 600,
                            fontSize: '1.4rem',
                        }}
                    >
                        ChessDojo
                    </Typography>
                </Stack>
                {children}
            </Container>
        </Box>
    );
}

function Title({ children }: { children: ReactNode }) {
    return (
        <Typography
            component='h1'
            sx={{
                fontFamily: (theme) => fontFamily(theme, anton),
                fontSize: { xs: 'clamp(1.9rem, 8.8vw, 2.9rem)', md: '3.6rem', lg: '4.1rem' },
                lineHeight: 1.1,
                letterSpacing: '0.005em',
                textWrap: 'balance',
            }}
        >
            {children}
        </Typography>
    );
}

/** Days, hours, minutes and seconds until predictions lock, as four fixed cells. */
function Countdown({ lockAt, frozenAt }: { lockAt: number; frozenAt?: number }) {
    const left = useTimeLeft(lockAt, frozenAt);
    const seconds = Math.max(0, Math.floor((left ?? 0) / 1000));
    const cells = [
        { value: Math.floor(seconds / 86400), unit: HERO.clock.days },
        { value: Math.floor((seconds % 86400) / 3600), unit: HERO.clock.hours },
        { value: Math.floor((seconds % 3600) / 60), unit: HERO.clock.minutes },
        { value: seconds % 60, unit: HERO.clock.seconds },
    ];

    return (
        <Box>
            <Condensed sx={{ mb: 1, fontSize: { xs: '1.05rem', md: '1.2rem' }, fontWeight: 500 }}>
                {left === undefined ? HERO.countdownFallback : HERO.countdownLabel}
            </Condensed>
            <Stack
                direction='row'
                role='timer'
                aria-label={
                    left === undefined
                        ? HERO.countdownFallback
                        : `${HERO.countdownLabel} ${formatCountdown(left)}`
                }
                sx={{ gap: { xs: 0.75, md: 1 } }}
            >
                {cells.map((cell) => (
                    <Box
                        key={cell.unit}
                        aria-hidden
                        sx={{
                            minWidth: { xs: '3.6rem', md: '4.4rem' },
                            py: { xs: 0.75, md: 1 },
                            textAlign: 'center',
                            borderRadius: 2,
                            bgcolor: 'rgba(8, 8, 15, 0.72)',
                            boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
                        }}
                    >
                        <Typography
                            component='span'
                            sx={{
                                display: 'block',
                                fontFamily: (theme) => fontFamily(theme, anton),
                                fontSize: { xs: '1.75rem', md: '2.3rem' },
                                lineHeight: 1.1,
                                color: ORANGE,
                                // Space is kept until the clock of the browser is read, so nothing jumps.
                                visibility: left === undefined ? 'hidden' : 'visible',
                            }}
                        >
                            {String(cell.value).padStart(2, '0')}
                        </Typography>
                        <Typography
                            component='span'
                            variant='caption'
                            sx={{
                                display: 'block',
                                color: MUTED,
                                fontSize: '0.72rem',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {cell.unit}
                        </Typography>
                    </Box>
                ))}
            </Stack>
            <Typography variant='body2' sx={{ mt: 1, color: MUTED, minHeight: '1.45em' }}>
                {left === undefined ? HERO.lockAtVenue : formatLockMoment(lockAt)}
            </Typography>
        </Box>
    );
}

function OpenHero({
    config,
    frozenAt,
    onClosed,
}: {
    config: ContestConfig;
    frozenAt?: number;
    onClosed: () => void;
}) {
    const variant = config.headline === 'C' && !config.prizes.confirmed ? 'A' : config.headline;
    const lines = sentences(HERO.headlines[variant]);

    return (
        <HeroFrame>
            <Box
                sx={{
                    mt: { xs: 2.5, md: 7 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr minmax(0, 30rem)' },
                    gap: { xs: 2.5, md: 8 },
                    alignItems: 'center',
                }}
            >
                <Box sx={entranceSx(0)}>
                    <Title>
                        {lines.map((line, index) => (
                            <Box
                                key={line}
                                component='span'
                                sx={{
                                    display: 'block',
                                    color: index === 0 && lines.length > 1 ? ORANGE : 'inherit',
                                }}
                            >
                                {line}
                            </Box>
                        ))}
                    </Title>
                    <Body
                        sx={{
                            mt: { xs: 1.5, md: 2.5 },
                            mb: { xs: 2, md: 3.5 },
                            color: 'common.white',
                            fontSize: { xs: '1.125rem', md: '1.35rem' },
                            maxWidth: '34rem',
                            textWrap: 'balance',
                        }}
                    >
                        {config.prizes.confirmed
                            ? HERO.subWithPrize(config.prizes.first)
                            : HERO.sub}
                    </Body>
                    <Countdown lockAt={config.lockAt} frozenAt={frozenAt} />
                    <Body sx={{ mt: 3, fontSize: '1rem', display: { xs: 'none', md: 'block' } }}>
                        {HERO.proof}
                    </Body>
                </Box>

                <Box sx={entranceSx(120)}>
                    <PickFlow onClosed={onClosed} />
                    <Typography
                        variant='body2'
                        sx={{ mt: 1.5, textAlign: 'center', color: 'rgba(255, 255, 255, 0.85)' }}
                    >
                        {HERO.microcopy}
                    </Typography>
                    <Body
                        sx={{
                            mt: 1,
                            fontSize: '0.95rem',
                            textAlign: 'center',
                            display: { md: 'none' },
                        }}
                    >
                        {HERO.proof}
                    </Body>
                </Box>
            </Box>
        </HeroFrame>
    );
}

function NextStep({ config, offerStatus }: { config: ContestConfig; offerStatus: OfferStatus }) {
    if (offerStatus === 'live') {
        return (
            <Box sx={nextStepSx}>
                <Condensed sx={{ fontSize: '1.45rem' }}>
                    {OFFER_OPTIONS[config.offer.option].heading}
                </Condensed>
                <Button
                    variant='contained'
                    color='dojoOrange'
                    onClick={() => {
                        trackEvent(EventType.WcOfferClick, { placement: 'confirmation' });
                        document
                            .getElementById(OFFER_ELEMENT_ID)
                            ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    sx={{ mt: 1.5, minHeight: 48, px: 3, fontWeight: 600 }}
                >
                    {CONFIRMATION.offerCta}
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={nextStepSx}>
            {offerStatus === 'early-access-teaser' && (
                <Body sx={{ mb: 1.5, color: 'common.white' }}>
                    {CONFIRMATION.earlyAccess(config.offer.earlyAccessLabel)}
                </Body>
            )}
            <Body sx={{ fontSize: '1.05rem' }}>{CONFIRMATION.classInvite.body}</Body>
            <Button
                component={Link}
                href={CONFIRMATION.classInvite.href}
                variant='contained'
                color='dojoOrange'
                sx={{ mt: 1.5, minHeight: 48, px: 3, fontWeight: 600 }}
            >
                {CONFIRMATION.classInvite.cta}
            </Button>
        </Box>
    );
}

const nextStepSx = {
    mt: 3,
    p: { xs: 2.25, sm: 2.75 },
    borderRadius: 3,
    bgcolor: INK_RAISED,
    border: `1px solid ${HAIRLINE}`,
} as const;

function ConfirmedHero({
    entry,
    config,
    offerStatus,
}: {
    entry: StoredEntry;
    config: ContestConfig;
    offerStatus: OfferStatus;
}) {
    return (
        <HeroFrame>
            <Box
                sx={{
                    mt: { xs: 2.5, md: 6 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr minmax(0, 28rem)' },
                    gridTemplateAreas: {
                        xs: '"head" "card" "actions"',
                        md: '"head card" "actions card"',
                    },
                    gridTemplateRows: { md: 'auto 1fr' },
                    columnGap: 8,
                    rowGap: 2.5,
                }}
            >
                <Box sx={{ gridArea: 'head', ...entranceSx(0) }}>
                    <CheckCircle sx={{ mb: 1, fontSize: '2.25rem', color: '#7FD66B' }} />
                    <Title>{CONFIRMATION.heading}</Title>
                    <Body
                        sx={{
                            mt: 1.5,
                            color: 'common.white',
                            fontSize: { xs: '1.125rem', md: '1.25rem' },
                            maxWidth: '34rem',
                        }}
                    >
                        {CONFIRMATION.body}
                    </Body>
                </Box>

                <Box
                    sx={{
                        gridArea: 'card',
                        animation: `${stampIn} 520ms ${EASE_OUT} 80ms both`,
                    }}
                >
                    <PicksCard picks={entry.picks} displayName={entry.displayName} />
                </Box>

                <Box sx={{ gridArea: 'actions' }}>
                    <ShareButtons picks={entry.picks} displayName={entry.displayName} />
                    <Button
                        onClick={() => reopenEntry(entry)}
                        sx={{ mt: 1, color: MUTED, minHeight: 44, px: 1.5, ml: -1.5 }}
                    >
                        {CONFIRMATION.changePicks}
                    </Button>
                    <NextStep config={config} offerStatus={offerStatus} />
                </Box>
            </Box>
        </HeroFrame>
    );
}

function ResultsSignup() {
    const signedUp = useResultsSignup();
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState('');
    const [errors, setErrors] = useState<{ email?: string; consent?: string; form?: string }>({});
    const [loading, setLoading] = useState(false);

    if (signedUp) {
        return (
            <Stack direction='row' role='status' sx={{ mt: 3, gap: 1, color: '#7FD66B' }}>
                <CheckCircle />
                <Body sx={{ color: 'common.white' }}>{LIVE.done}</Body>
            </Stack>
        );
    }

    const onSubmit = async (event: { preventDefault: () => void }) => {
        event.preventDefault();
        const parsed = wcResultsSignupSchema.safeParse({
            kind: 'results',
            email: email.trim(),
            consent,
            attribution: getAttribution(),
            website,
        });
        if (!parsed.success) {
            const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
            setErrors({
                email: fields.has('email') ? 'Enter a valid email address.' : undefined,
                consent: fields.has('consent') ? LIVE.consentError : undefined,
            });
            return;
        }

        setErrors({});
        setLoading(true);
        const outcome = await submitEntry(parsed.data);
        setLoading(false);
        if (outcome !== 'stored') {
            setErrors({ form: LIVE.saveError });
            return;
        }
        metaLead();
        saveResultsSignup();
    };

    return (
        <Stack
            component='form'
            noValidate
            onSubmit={(event) => void onSubmit(event)}
            sx={{ mt: 3, gap: 1.75, maxWidth: '28rem' }}
        >
            <TextField
                required
                type='email'
                label={LIVE.emailLabel}
                autoComplete='email'
                value={email}
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
                    sx={{ alignItems: 'flex-start', m: 0, minHeight: 44 }}
                    control={
                        <Checkbox
                            checked={consent}
                            onChange={(event) => setConsent(event.target.checked)}
                            sx={{ p: 0, pr: 1, color: 'rgba(255,255,255,0.7)' }}
                        />
                    }
                    label={
                        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.85)' }}>
                            {LIVE.consent} See the{' '}
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
            {errors.form && (
                <Typography role='alert' variant='body2' color='error'>
                    {errors.form}
                </Typography>
            )}
            <Button
                type='submit'
                variant='contained'
                color='dojoOrange'
                size='large'
                loading={loading}
                sx={{ fontWeight: 600, fontSize: '1.05rem', minHeight: 56 }}
            >
                {LIVE.submit}
            </Button>
        </Stack>
    );
}

function LiveHero({ entry }: { entry?: StoredEntry }) {
    return (
        <HeroFrame>
            <Box
                sx={{
                    mt: { xs: 2.5, md: 6 },
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: entry ? '1fr minmax(0, 28rem)' : 'minmax(0, 44rem)',
                    },
                    gap: { xs: 3, md: 8 },
                    alignItems: 'start',
                }}
            >
                <Box sx={entranceSx(0)}>
                    <Title>{LIVE.heading}</Title>
                    <Body
                        sx={{
                            mt: 1.5,
                            color: 'common.white',
                            fontSize: { xs: '1.125rem', md: '1.25rem' },
                            maxWidth: '36rem',
                        }}
                    >
                        {entry ? LIVE.subWithEntry : LIVE.subWithoutEntry}
                    </Body>
                    {!entry && <ResultsSignup />}
                </Box>
                {entry && (
                    <Box sx={entranceSx(120)}>
                        <PicksCard picks={entry.picks} displayName={entry.displayName} />
                    </Box>
                )}
            </Box>
        </HeroFrame>
    );
}

function resultLines(results: Results): { label: string; value: string }[] {
    return [
        { label: 'Match winner', value: PLAYERS[results.winner].name },
        { label: 'Decided in', value: results.tiebreaks ? 'Tiebreaks' : 'Classical games' },
        { label: 'Classical score', value: results.classicalScore },
        { label: 'Games with a winner', value: String(results.decisiveGames) },
        {
            label: 'First game with a winner',
            value: results.firstDecisiveGame ? `Game ${results.firstDecisiveGame}` : 'None',
        },
    ];
}

function FinishedHero({ results, entry }: { results: Results; entry?: StoredEntry }) {
    return (
        <HeroFrame>
            <Box
                sx={{
                    mt: { xs: 2.5, md: 6 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr minmax(0, 28rem)' },
                    gap: { xs: 3, md: 8 },
                    alignItems: 'start',
                }}
            >
                <Box sx={entranceSx(0)}>
                    <Stack direction='row' sx={{ mt: 1.5, alignItems: 'center', gap: 1.25 }}>
                        <Flag player={results.winner} width={42} />
                        <Condensed sx={{ color: MUTED, fontSize: '1.2rem' }}>
                            {PLAYERS[results.winner].fullName}
                        </Condensed>
                    </Stack>
                    <Title>{FINISHED.heading(PLAYERS[results.winner].name)}</Title>

                    {results.winners.length > 0 && (
                        <Box sx={{ mt: 4 }}>
                            <Condensed component='h2' sx={{ fontSize: '1.7rem' }}>
                                {FINISHED.winnersHeading}
                            </Condensed>
                            <Box component='ol' sx={{ listStyle: 'none', p: 0, m: 0, mt: 1 }}>
                                {results.winners.map((winner) => (
                                    <Stack
                                        key={`${winner.place}-${winner.name}`}
                                        component='li'
                                        direction='row'
                                        sx={{
                                            py: 1.25,
                                            gap: 2,
                                            alignItems: 'baseline',
                                            borderBottom: `1px solid ${HAIRLINE}`,
                                        }}
                                    >
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: ORANGE,
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                minWidth: '6rem',
                                            }}
                                        >
                                            {winner.place}
                                        </Typography>
                                        <Condensed
                                            sx={{
                                                flex: 1,
                                                fontSize: '1.35rem',
                                                overflowWrap: 'anywhere',
                                            }}
                                        >
                                            {winner.name}
                                        </Condensed>
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: MUTED,
                                                fontSize: '1rem',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {FINISHED.pointsLabel(winner.points)}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>

                <Box sx={entranceSx(120)}>
                    <Box
                        sx={{
                            p: { xs: 2.5, sm: 3.5 },
                            borderRadius: 3,
                            bgcolor: INK_RAISED,
                            border: `1px solid ${HAIRLINE}`,
                            borderTop: `4px solid ${ORANGE}`,
                        }}
                    >
                        <Condensed component='h2' sx={{ fontSize: '1.7rem' }}>
                            {FINISHED.answersHeading}
                        </Condensed>
                        <Box component='dl' sx={{ mt: 1.5, mb: 0 }}>
                            {resultLines(results).map((line) => (
                                <Stack
                                    key={line.label}
                                    direction='row'
                                    sx={{
                                        py: 1.25,
                                        gap: 2,
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        borderTop: `1px solid ${HAIRLINE}`,
                                    }}
                                >
                                    <Typography
                                        component='dt'
                                        variant='body2'
                                        sx={{ color: MUTED, fontSize: '1rem' }}
                                    >
                                        {line.label}
                                    </Typography>
                                    <Condensed component='dd' sx={{ m: 0, fontSize: '1.4rem' }}>
                                        {line.value}
                                    </Condensed>
                                </Stack>
                            ))}
                        </Box>
                        <Typography
                            variant='body2'
                            sx={{
                                pt: 1.25,
                                color: MUTED,
                                fontSize: '0.95rem',
                                borderTop: `1px solid ${HAIRLINE}`,
                            }}
                        >
                            {FINISHED.game1Line(results.game1Moves)}
                        </Typography>
                    </Box>

                    {entry && (
                        <Box sx={{ mt: 3 }}>
                            <Condensed component='h2' sx={{ mb: 1.5, fontSize: '1.7rem' }}>
                                {FINISHED.yourScore(scorePicks(entry.picks, results))}
                            </Condensed>
                            <PicksCard picks={entry.picks} displayName={entry.displayName} />
                        </Box>
                    )}
                </Box>
            </Box>
        </HeroFrame>
    );
}

export function Hero({
    phase,
    config,
    entry,
    offerStatus,
    frozenAt,
    onClosed,
}: {
    phase: 'open' | 'live' | 'finished';
    config: ContestConfig;
    entry?: StoredEntry;
    offerStatus: OfferStatus;
    frozenAt?: number;
    onClosed: () => void;
}) {
    if (phase === 'finished' && config.results) {
        return <FinishedHero results={config.results} entry={entry} />;
    }
    if (phase === 'live') {
        return <LiveHero entry={entry} />;
    }
    if (entry) {
        return <ConfirmedHero entry={entry} config={config} offerStatus={offerStatus} />;
    }
    return <OpenHero config={config} frozenAt={frozenAt} onClosed={onClosed} />;
}
