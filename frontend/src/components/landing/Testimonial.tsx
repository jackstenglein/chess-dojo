import CohortIcon from '@/scoreboard/CohortIcon';
import { fontFamily } from '@/style/font';
import { ChevronLeft, ChevronRight, Circle } from '@mui/icons-material';
import { Grid, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Children, ReactNode, useCallback, useEffect, useState } from 'react';
import { BackgroundImageContainer } from './BackgroundImage';
import { anton, barlow, barlowCondensed } from './fonts';
import { JoinDojoButton } from './JoinDojoButton';
import quoteImage from './quote.webp';
import backgroundImage from './testimonial-background.webp';
import { testimonials } from './testimonials';

export function TestimonialSection() {
    const t = useTranslations('landing');
    const isSm = useMediaQuery((theme) => theme.breakpoints.down('md'));

    return (
        <BackgroundImageContainer
            src={backgroundImage}
            background='linear-gradient(270deg, #141422 0%, #06060B 100%)'
            slotProps={{ image: { style: { opacity: 0.3 } } }}
        >
            <Stack
                sx={{
                    gap: '1rem',
                    alignItems: 'center',
                }}
            >
                <Typography
                    sx={{
                        textAlign: 'center',
                        fontFamily: (theme) => fontFamily(theme, anton),
                        lineHeight: '4.625rem',
                        fontSize: '3.75rem',
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
                <Typography
                    color='dojoOrange'
                    sx={{
                        fontWeight: '600',
                        fontSize: '1.1875rem',
                        lineHeight: '2.125rem',
                        letterSpacing: '11%',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                    }}
                >
                    {t('testimonialSection.subheading')}
                </Typography>
            </Stack>

            <Stack
                direction='row'
                sx={{
                    mt: '3.125rem',
                }}
            >
                {isSm ? (
                    <Carousel>
                        {testimonials.map((testimonial) => (
                            <Testimonial
                                key={testimonial.key}
                                quote={t(`testimonials.${testimonial.key}.quote`)}
                                name={t(`testimonials.${testimonial.key}.name`)}
                                rating={t(`testimonials.${testimonial.key}.rating`)}
                                cohort={testimonial.cohort}
                            />
                        ))}
                    </Carousel>
                ) : (
                    <Grid container spacing='2rem'>
                        {testimonials.map((testimonial) => (
                            <Grid
                                size={3}
                                key={testimonial.key}
                                sx={{
                                    height: 1,
                                }}
                            >
                                <Testimonial
                                    quote={t(`testimonials.${testimonial.key}.quote`)}
                                    name={t(`testimonials.${testimonial.key}.name`)}
                                    rating={t(`testimonials.${testimonial.key}.rating`)}
                                    cohort={testimonial.cohort}
                                />
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
        </BackgroundImageContainer>
    );
}

function Testimonial({
    quote,
    name,
    rating,
    cohort,
}: {
    quote: string;
    name: string;
    rating: string;
    cohort: string;
}) {
    return (
        <Stack
            sx={{
                padding: '1.25rem',
                background: 'linear-gradient(180deg, #1B1B2C 0%, #06060B 100%)',
                minHeight: '23.125rem',
                justifyContent: 'space-between',
                borderRadius: 1,
                gap: '1.5rem',
                height: 1,
            }}
        >
            <Image src={quoteImage} alt='' style={{ width: '2.3125rem', height: '2.3125rem' }} />

            <Typography
                sx={{
                    fontFamily: (theme) => fontFamily(theme, barlow),
                    fontSize: '1.0625rem',
                    lineHeight: '1.75rem',
                }}
            >
                {quote}
            </Typography>

            <Stack
                direction='row'
                sx={{
                    columnGap: '0.625rem',
                }}
            >
                <CohortIcon cohort={cohort} tooltip='' />

                <Stack
                    sx={{
                        gap: 0.75,
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
                            letterSpacing: '8%',
                            textTransform: 'uppercase',
                        }}
                        color='dojoOrange'
                    >
                        {rating}
                    </Typography>
                </Stack>
            </Stack>
        </Stack>
    );
}

function Carousel({ children }: { children: ReactNode }) {
    const [index, setIndex] = useState(0);
    const count = Children.count(children);

    const onNext = useCallback(() => {
        setIndex(index + 1 === count ? 0 : index + 1);
    }, [setIndex, count, index]);

    const onPrev = () => {
        setIndex((i) => (i === 0 ? count - 1 : i - 1));
    };

    useEffect(() => {
        const id = setInterval(onNext, 10 * 1000);
        return () => clearInterval(id);
    }, [onNext]);

    return (
        <Stack>
            {Children.toArray(children)[index]}
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <IconButton size='large' onClick={onPrev}>
                    <ChevronLeft fontSize='large' />
                </IconButton>

                <Stack
                    direction='row'
                    sx={{
                        gap: 0.5,
                    }}
                >
                    {Array.from({ length: count }).map((_, i) => (
                        <Circle
                            onClick={() => setIndex(i)}
                            key={i}
                            sx={{
                                width: '10px',
                                height: '10px',
                                color: i === index ? 'rgb(73, 73, 73)' : 'rgb(175, 175, 175)',
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </Stack>

                <IconButton size='large' onClick={onNext}>
                    <ChevronRight fontSize='large' />
                </IconButton>
            </Stack>
        </Stack>
    );
}
