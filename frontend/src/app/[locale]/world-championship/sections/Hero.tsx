'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { metaLead } from '@/analytics/meta';
import { anton, barlowCondensed } from '@/components/landing/fonts';
import { Link } from '@/components/navigation/Link';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { CheckCircle, Schedule } from '@mui/icons-material';
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
import { BoardMotif, clipSx, Flag } from './Motif';
import { PickFlow, scrollToFlow } from './PickFlow';
import { PicksCard, ShareButtons } from './PicksCard';

function entranceSx(delayMs: number) {
    return { animation: `${riseIn} 800ms ${EASE_OUT} ${delayMs}ms both` };
}

function HeroFrame({ children, cta }: { children: ReactNode; cta?: boolean }) {
    return (
        <Box
            sx={{
                position: 'relative',
                ...clipSx,
                isolation: 'isolate',
                background: `linear-gradient(180deg, #10101C 0%, ${INK} 100%)`,
            }}
        >
            <BoardMotif
                sx={{
                    zIndex: -1,
                    top: { xs: '-4rem', md: '-9rem' },
                    right: { xs: '-9rem', md: '-7rem' },
                    width: { xs: '34rem', md: '58rem' },
                }}
            />
            <Container maxWidth='lg' sx={{ pt: 2, pb: { xs: 5, md: 9 } }}>
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}
                >
                    <Stack
                        component={Link}
                        href='/'
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            gap: 1,
                            color: 'common.white',
                            textDecoration: 'none',
                        }}
                    >
                        <ChessDojoIcon sx={{ fontSize: '2.5rem' }} />
                        <Typography
                            sx={{
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: 600,
                                fontSize: '1.5rem',
                            }}
                        >
                            ChessDojo
                        </Typography>
                    </Stack>
                    {cta && (
                        <Button
                            onClick={scrollToFlow}
                            sx={{
                                color: ORANGE,
                                fontWeight: 600,
                                minHeight: 44,
                                px: 1.5,
                                mr: -1.5,
                            }}
                        >
                            {HERO.cta}
                        </Button>
                    )}
                </Stack>
                {children}
            </Container>
        </Box>
    );
}

function Eyebrow() {
    return (
        <Condensed
            sx={{
                color: ORANGE,
                fontSize: { xs: '0.95rem', md: '1.15rem' },
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
            }}
        >
            {HERO.eyebrow}
        </Condensed>
    );
}

function Title({ children }: { children: ReactNode }) {
    return (
        <Typography
            component='h1'
            sx={{
                mt: 1.25,
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

function Countdown({ lockAt, frozenAt }: { lockAt: number; frozenAt?: number }) {
    const left = useTimeLeft(lockAt, frozenAt);

    return (
        <Box>
            <Stack
                direction='row'
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    minHeight: 44,
                    px: 1.75,
                    borderRadius: 2,
                    bgcolor: 'rgba(247, 148, 31, 0.12)',
                    border: '1px solid rgba(247, 148, 31, 0.45)',
                }}
            >
                <Schedule sx={{ fontSize: 20, color: ORANGE }} />
                <Condensed sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' }, whiteSpace: 'nowrap' }}>
                    {left === undefined ? (
                        HERO.countdownFallback
                    ) : (
                        <>
                            {HERO.countdownLabel}{' '}
                            <Box component='span' sx={{ color: ORANGE }}>
                                {formatCountdown(left)}
                            </Box>
                        </>
                    )}
                </Condensed>
            </Stack>
            <Typography variant='body2' sx={{ mt: 0.75, color: MUTED, minHeight: '1.45em' }}>
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
        <HeroFrame cta>
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
                    <Eyebrow />
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
                            textWrap: 'pretty',
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
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1, color: '#7FD66B' }}>
                        <CheckCircle />
                        <Eyebrow />
                    </Stack>
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

                <Box sx={{ gridArea: 'card', ...entranceSx(120) }}>
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
                    <Eyebrow />
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
                    <Eyebrow />
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
