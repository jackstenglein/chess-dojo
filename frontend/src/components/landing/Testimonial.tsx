import { fontFamily } from '@/style/font';
import { ChevronLeft, ChevronRight, Circle } from '@mui/icons-material';
import {
    Box,
    Card,
    Container,
    Grid,
    IconButton,
    Stack,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Children, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Avatar from 'src/profile/Avatar';
import { barlow, barlowCondensed, eyebrowSx, sectionTitleSx } from './fonts';
import { JoinDojoButton } from './JoinDojoButton';
import { TestimonialData, testimonials } from './testimonials';

export function TestimonialSection() {
    const t = useTranslations('landing');
    const isSm = useMediaQuery((theme) => theme.breakpoints.down('md'));

    const testimonialDetails = (testimonial: TestimonialData) => ({
        ...testimonial,
        quote: t(`testimonials.${testimonial.key}.quote`),
        name: t(`testimonials.${testimonial.key}.name`),
    });

    return (
        <Box sx={{ py: '5.5rem' }}>
            <Container maxWidth='lg'>
                <Stack
                    sx={{
                        gap: '1rem',
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        color='dojoOrange'
                        sx={{
                            ...eyebrowSx,
                            textAlign: 'center',
                        }}
                    >
                        {t('testimonialSection.subheading')}
                    </Typography>
                    <Typography
                        sx={{
                            textAlign: 'center',
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            ...sectionTitleSx,
                        }}
                    >
                        {t('testimonialSection.heading')
                            .split('\n')
                            .map((line, i) => (
                                <span key={i}>
                                    {i > 0 && <br />}
                                    {line}
                                </span>
                            ))}
                    </Typography>
                </Stack>

                <Stack
                    sx={{
                        mt: '3.125rem',
                        gap: '2rem',
                    }}
                >
                    {isSm ? (
                        <Carousel>
                            {testimonials.map((testimonial) => (
                                <Testimonial
                                    {...testimonialDetails(testimonial)}
                                    key={testimonial.key}
                                />
                            ))}
                        </Carousel>
                    ) : (
                        <Grid container spacing='2rem'>
                            {testimonials.map((testimonial) => (
                                <Grid size={{ xs: 12, md: 4 }} key={testimonial.key}>
                                    <Testimonial {...testimonialDetails(testimonial)} />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Stack>

                <Stack
                    sx={{
                        alignItems: 'center',
                        mt: '3rem',
                    }}
                >
                    <JoinDojoButton />
                </Stack>
            </Container>
        </Box>
    );
}

function Testimonial({
    quote,
    name,
    ratingBefore,
    ratingAfter,
}: {
    quote: string;
    name: string;
    ratingBefore: string;
    ratingAfter: string;
}) {
    return (
        <Card
            sx={{
                padding: '1.25rem',
                justifyContent: 'space-between',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                height: 1,
            }}
        >
            <Stack sx={{ gap: '1.25rem', flex: 1 }}>
                <Typography
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, barlow),
                        fontSize: '1.0625rem',
                        lineHeight: '1.75rem',
                    }}
                >
                    "{quote}"
                </Typography>
            </Stack>

            <Stack>
                <Avatar size={40} username='' />

                <Stack
                    sx={{
                        gap: 0.75,
                        mt: 0.75,
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontWeight: '600',
                            fontSize: '1.3125rem',
                            lineHeight: '1.3125rem',
                        }}
                    >
                        {name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                        }}
                        color='dojoOrange'
                    >
                        {ratingBefore} → {ratingAfter}
                    </Typography>
                </Stack>
            </Stack>
        </Card>
    );
}

function Carousel({ children }: { children: ReactNode }) {
    const t = useTranslations('landing');
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const count = Children.count(children);
    const touchStartX = useRef<number | null>(null);
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

    const onNext = useCallback(() => {
        setIndex((i) => (i + 1 === count ? 0 : i + 1));
    }, [count]);

    const onPrev = () => {
        setIndex((i) => (i === 0 ? count - 1 : i - 1));
    };

    useEffect(() => {
        if (paused || prefersReducedMotion) {
            return;
        }
        const id = setInterval(onNext, 10 * 1000);
        return () => clearInterval(id);
    }, [onNext, paused, prefersReducedMotion]);

    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        setPaused(true);
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) {
            return;
        }
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (dx > 40) {
            onPrev();
        } else if (dx < -40) {
            onNext();
        }
    };

    return (
        <Stack
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {Children.toArray(children)[index]}
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 1,
                }}
            >
                <IconButton
                    size='large'
                    onClick={onPrev}
                    aria-label={t('testimonialSection.previous')}
                >
                    <ChevronLeft fontSize='large' />
                </IconButton>

                <Stack
                    direction='row'
                    sx={{
                        gap: 1,
                    }}
                >
                    {Array.from({ length: count }).map((_, i) => (
                        <IconButton
                            key={i}
                            onClick={() => setIndex(i)}
                            aria-label={t('testimonialSection.goTo', { index: i + 1 })}
                            aria-current={i === index ? 'true' : undefined}
                            size='small'
                            sx={{ p: 0.75 }}
                        >
                            <Circle
                                sx={{
                                    width: 14,
                                    height: 14,
                                    color:
                                        i === index
                                            ? 'dojoOrange.main'
                                            : 'rgba(255, 255, 255, 0.45)',
                                }}
                            />
                        </IconButton>
                    ))}
                </Stack>

                <IconButton size='large' onClick={onNext} aria-label={t('testimonialSection.next')}>
                    <ChevronRight fontSize='large' />
                </IconButton>
            </Stack>
        </Stack>
    );
}
