import { barlowCondensed } from '@/components/landing/fonts';
import { Link } from '@/components/navigation/Link';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
import {
    Body,
    Condensed,
    EASE_OUT,
    fadeIn,
    HAIRLINE,
    INK,
    MUTED,
    ORANGE,
    scrollToOffer,
} from '../../class/sections/shared';
import { HERO, heroHeadline, startLabel } from '../content';
import { DemoRun } from './DemoRun';
import { softIn } from './motion';
import {
    bodyFontSx,
    Display,
    HERO_ELEMENT_ID,
    primaryButtonSx,
    RunPips,
    TOP_ACTION_ID,
} from './parts';

export const START_BUTTON_ID = 'rush-start';

/**
 * The top of the page arrives as one short cascade. The button is the point of the
 * page, so it is in place within half a second.
 */
function entranceSx(step: number) {
    return { animation: `${softIn} 520ms ${EASE_OUT} ${step * 55}ms both` };
}

/** What the three runs earn, with one empty pip per run still to play. */
function Reward() {
    return (
        <Stack
            direction='row'
            sx={{
                ...entranceSx(2),
                mt: 2.5,
                py: 1.25,
                pl: 1.5,
                pr: 2,
                gap: 1.5,
                alignItems: 'center',
                maxWidth: '36rem',
                borderRadius: 2,
                border: '1px solid rgba(247, 148, 31, 0.45)',
                bgcolor: 'rgba(247, 148, 31, 0.08)',
            }}
        >
            <Box sx={{ flexShrink: 0 }}>
                <RunPips done={0} small />
            </Box>
            <Typography
                sx={{ ...bodyFontSx, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.4 }}
            >
                {HERO.reward}
            </Typography>
        </Stack>
    );
}

/** The ground and the brand row shared by the hero, the result and the unlock. */
export function TopGround({ children }: { children: ReactNode }) {
    return (
        <Box
            id={HERO_ELEMENT_ID}
            sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: -1,
                    bgcolor: INK,
                    overflow: 'hidden',
                }}
            >
                {/*
                 * One warm light behind the panel on the right, like a lamp over a board.
                 * It hangs from the right edge of the page's column (1200px at most, 24px
                 * of padding), so it stays behind the panel at every width. On a phone the
                 * panel is the last thing in the section, so the light sits low and centred.
                 */}
                <Box
                    sx={{
                        position: 'absolute',
                        width: { xs: '34rem', md: '64rem' },
                        height: { xs: '34rem', md: '46rem' },
                        top: { xs: 'auto', md: '53%' },
                        bottom: { xs: '-1rem', md: 'auto' },
                        left: { xs: '50%', md: 'auto' },
                        right: { md: 'calc(max(24px, (100% - 1200px) / 2 + 24px) - 19rem)' },
                        transform: { xs: 'translateX(-50%)', md: 'translateY(-50%)' },
                        background:
                            'radial-gradient(closest-side, rgba(247, 148, 31, 0.34) 0%, rgba(247, 148, 31, 0.21) 30%, rgba(247, 148, 31, 0.1) 55%, rgba(247, 148, 31, 0.03) 80%, rgba(247, 148, 31, 0) 100%)',
                        animation: `${fadeIn} 1200ms ease both`,
                    }}
                />
            </Box>

            <Container maxWidth='lg' sx={{ pt: 1.5, pb: { xs: 5, md: 8 } }}>
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <Stack
                        component={Link}
                        href='/'
                        direction='row'
                        sx={{
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
                                fontSize: '1.45rem',
                            }}
                        >
                            ChessDojo
                        </Typography>
                    </Stack>
                    <Button
                        onClick={scrollToOffer}
                        sx={{ color: MUTED, fontWeight: 600, minHeight: 44, px: 1.5, mr: -1.5 }}
                    >
                        Plans
                    </Button>
                </Stack>

                {children}
            </Container>
        </Box>
    );
}

/** What a visitor sees before their first run. */
export function Hero({ onStart, loadFailed }: { onStart: () => void; loadFailed: boolean }) {
    return (
        <TopGround>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 26rem)' },
                    columnGap: 8,
                    rowGap: 5,
                    alignItems: 'center',
                    mt: { xs: 2.5, md: 7 },
                }}
            >
                <Box>
                    <Condensed
                        sx={{
                            ...entranceSx(0),
                            mb: 1.25,
                            color: ORANGE,
                            fontSize: { xs: '1.05rem', md: '1.25rem' },
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {HERO.eyebrow}
                    </Condensed>
                    <Display sx={entranceSx(0)}>{heroHeadline()}</Display>
                    <Body
                        sx={{
                            ...entranceSx(1),
                            mt: 2,
                            color: 'common.white',
                            fontSize: { xs: '1.125rem', md: '1.3rem' },
                            maxWidth: '36rem',
                        }}
                    >
                        {HERO.sub}
                    </Body>
                    <Reward />

                    <Box id={TOP_ACTION_ID} sx={{ ...entranceSx(3), mt: 2.5 }}>
                        <Button
                            id={START_BUTTON_ID}
                            variant='contained'
                            color='dojoOrange'
                            size='large'
                            onClick={onStart}
                            sx={{ ...primaryButtonSx, width: { xs: 1, sm: 'auto' }, minWidth: 260 }}
                        >
                            {startLabel(1)}
                        </Button>
                        <Typography
                            variant='body2'
                            sx={{ mt: 1.25, color: MUTED, textAlign: { xs: 'center', sm: 'left' } }}
                        >
                            {HERO.microcopy}
                        </Typography>
                        {loadFailed && (
                            <Typography
                                role='alert'
                                sx={{ ...bodyFontSx, mt: 1.5, color: '#FF8A7A' }}
                            >
                                The puzzles did not load. Check your connection and tap the button
                                again.
                            </Typography>
                        )}
                    </Box>

                    <Typography
                        sx={{
                            ...entranceSx(4),
                            ...bodyFontSx,
                            mt: 3,
                            pt: 2,
                            borderTop: `1px solid ${HAIRLINE}`,
                            color: MUTED,
                            fontSize: '1rem',
                            maxWidth: '36rem',
                        }}
                    >
                        {HERO.proof}
                    </Typography>
                </Box>

                <Box sx={entranceSx(2)}>
                    <DemoRun onStart={onStart} />
                </Box>
            </Box>
        </TopGround>
    );
}
