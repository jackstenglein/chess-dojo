'use client';

import { Link } from '@/components/navigation/Link';
import { CalendarSessionType } from '@/database/event';
import { PresenterIcon } from '@/style/PresenterIcon';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { PersonOutlined, School, Troubleshoot } from '@mui/icons-material';
import {
    Box,
    Button,
    ButtonProps,
    Card,
    CardContent,
    Grid,
    GridProps,
    Stack,
    Theme,
    Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { JSX, ReactNode, useSyncExternalStore } from 'react';
import { Request } from '../api/Request';
import SellingPoint, { SellingPointProps, SellingPointStatus } from './SellingPoint';
import { getCurrency } from './locales';

function accentColor(tier: SubscriptionTier): string {
    switch (tier) {
        case SubscriptionTier.Free:
            return '#616161';
        case SubscriptionTier.Basic:
            return '#e7ba51';
        case SubscriptionTier.Lecture:
            return '#33b679';
        case SubscriptionTier.GameReview:
            return '#039be5';
    }
}

function cardAccentSx(theme: Theme, tier: SubscriptionTier) {
    const color = accentColor(tier);
    const isDark = theme.palette.mode === 'dark';
    const wash = alpha(color, isDark ? 0.08 : 0.08);

    return {
        height: 1,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: wash,
        borderColor: alpha(color, isDark ? 0.48 : 0.36),
        '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            bgcolor: color,
        },
    };
}

export const priceDataByCurrency: Record<
    string,
    {
        symbol: string;
        [SubscriptionTier.Basic]: { month: number; year: number };
        [SubscriptionTier.Lecture]: { month: number; year: number };
        [SubscriptionTier.GameReview]: { month: number; year: number };
    }
> = {
    USD: {
        symbol: '$',
        [SubscriptionTier.Basic]: {
            month: 20,
            year: 12,
        },
        [SubscriptionTier.Lecture]: {
            month: 75,
            year: 67,
        },
        [SubscriptionTier.GameReview]: {
            month: 200,
            year: 180,
        },
    },
    EUR: {
        symbol: '€',
        [SubscriptionTier.Basic]: {
            month: 17,
            year: 10,
        },
        [SubscriptionTier.Lecture]: {
            month: 65,
            year: 58,
        },
        [SubscriptionTier.GameReview]: {
            month: 170,
            year: 153,
        },
    },
    GBP: {
        symbol: '£',
        [SubscriptionTier.Basic]: {
            month: 15,
            year: 10,
        },
        [SubscriptionTier.Lecture]: {
            month: 55,
            year: 50,
        },
        [SubscriptionTier.GameReview]: {
            month: 150,
            year: 135,
        },
    },
    INR: {
        symbol: '₹',
        [SubscriptionTier.Basic]: {
            month: 700,
            year: 467,
        },
        [SubscriptionTier.Lecture]: {
            month: 3250,
            year: 2925,
        },
        [SubscriptionTier.GameReview]: {
            month: 17925,
            year: 16130,
        },
    },
};

export type onSubscribeFunc = (
    tier: SubscriptionTier.Basic | SubscriptionTier.Lecture | SubscriptionTier.GameReview,
    interval: 'month' | 'year',
    price: { currency: string; value: number },
) => void;

interface PriceMatrixProps {
    request?: Request;
    interval: 'month' | 'year';
    selectedTier?: SubscriptionTier;
    onSubscribe: onSubscribeFunc;
    onFreeTier?: () => void;
    currentTier: SubscriptionTier;
    /** List of tiers to display in the matrix. If not included, all tiers are displayed. */
    tiers?: SubscriptionTier[];
}

function getGridSize(cardCount: number): GridProps['size'] {
    if (cardCount === 2) {
        return { xs: 12, sm: 9, md: 6 };
    }
    if (cardCount === 3) {
        return { xs: 12, sm: 8.5, md: 4, lg: 'grow' };
    }
    return { xs: 12, sm: 8.5, md: 6, lg: 'grow' };
}

function PriceMatrix({
    request,
    interval,
    selectedTier,
    onSubscribe,
    onFreeTier,
    currentTier,
    tiers: initialTiers,
}: PriceMatrixProps) {
    const t = useTranslations('upsell.priceMatrix');
    const currency = useSyncExternalStore(
        () => () => null,
        () => getCurrency(navigator.languages[0]),
        () => 'USD',
    );

    const priceData = priceDataByCurrency[currency || 'USD'] || priceDataByCurrency.USD;
    const tiers = initialTiers || Object.values(SubscriptionTier);
    let cardCount = tiers.length;
    if (!onFreeTier && tiers.includes(SubscriptionTier.Free)) {
        cardCount--;
    }

    return (
        <>
            {onFreeTier && tiers.includes(SubscriptionTier.Free) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        tier={SubscriptionTier.Free}
                        icon={<PersonOutlined sx={{ fontSize: 28 }} />}
                        name={t('freeTierName')}
                        price={{
                            value: 0,
                            symbol: priceData.symbol,
                            interval: '',
                        }}
                        sellingPoints={[
                            {
                                description: t('freeLimitedTrainingPlans'),
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: t('freeLimitedGameDatabase'),
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: t('freeLimitedPuzzles'),
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: t('freeOpeningCourses'),
                                status: SellingPointStatus.Excluded,
                            },
                            {
                                description: t('freeCommunityForum'),
                                status: SellingPointStatus.Excluded,
                            },
                        ]}
                        buttonProps={{
                            disabled: request?.isLoading(),
                            onClick: onFreeTier,
                            children: t('continueForFree'),
                            variant: 'outlined',
                            color: 'primary',
                        }}
                        isCurrentTier={false}
                    />
                </Grid>
            )}

            {tiers.includes(SubscriptionTier.Basic) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        tier={SubscriptionTier.Basic}
                        icon={<School sx={{ fontSize: 28 }} />}
                        name={t('coreTierName')}
                        price={{
                            fullValue:
                                interval === 'year'
                                    ? priceData[SubscriptionTier.Basic].month
                                    : undefined,
                            value: priceData[SubscriptionTier.Basic][interval],
                            symbol: priceData.symbol,
                            interval:
                                interval === 'year'
                                    ? t('intervalMonthWithAsterisk')
                                    : t('intervalMonth'),
                        }}
                        sellingPoints={[
                            {
                                description: t('coreAllTrainingPlans'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('coreRatingDashboard'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('coreFullGameDatabase'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('coreUnlimitedPuzzles'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('coreAllOpeningCourses'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('coreCommunityForum'),
                                status: SellingPointStatus.Included,
                            },
                        ]}
                        buttonProps={{
                            loading:
                                request?.isLoading() && selectedTier === SubscriptionTier.Basic,
                            disabled:
                                request?.isLoading() && selectedTier !== SubscriptionTier.Basic,
                            onClick: () =>
                                onSubscribe(SubscriptionTier.Basic, interval, {
                                    currency,
                                    value: priceData[SubscriptionTier.Basic][interval],
                                }),
                            children: t('startTraining'),
                        }}
                        isCurrentTier={currentTier === SubscriptionTier.Basic}
                    />
                </Grid>
            )}

            {tiers.includes(SubscriptionTier.Lecture) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        tier={SubscriptionTier.Lecture}
                        icon={<PresenterIcon sx={{ fontSize: 25 }} />}
                        name={t('lecturesTierName')}
                        price={{
                            fullValue:
                                interval === 'year'
                                    ? priceData[SubscriptionTier.Lecture].month
                                    : undefined,
                            value: priceData[SubscriptionTier.Lecture][interval],
                            symbol: priceData.symbol,
                            interval:
                                interval === 'year'
                                    ? t('intervalMonthWithAsterisk')
                                    : t('intervalMonth'),
                        }}
                        sellingPoints={[
                            {
                                description: t('lecturesEverythingFromCore'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('lecturesWeeklyLive'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('lecturesQandA'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('lecturesHomework'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('lecturesRecordings'),
                                status: SellingPointStatus.Included,
                            },
                        ]}
                        buttonProps={{
                            loading:
                                request?.isLoading() && selectedTier === SubscriptionTier.Lecture,
                            disabled:
                                request?.isLoading() && selectedTier !== SubscriptionTier.Lecture,
                            onClick: () =>
                                onSubscribe(SubscriptionTier.Lecture, 'month', {
                                    currency,
                                    value: priceData[SubscriptionTier.Lecture][interval],
                                }),
                            children: t('joinLectures'),
                        }}
                        beforeButton={
                            <Typography>
                                {t.rich('faqClassCalendar', {
                                    faqLink: (chunks) => (
                                        <Link target='_blank' href='/help?id=live-classes'>
                                            {chunks}
                                        </Link>
                                    ),
                                    calendarLink: (chunks) => (
                                        <Link
                                            target='_blank'
                                            href={`/calendar?sessions=${JSON.stringify([CalendarSessionType.Lectures])}&types=[]&tournaments=[]`}
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                })}
                            </Typography>
                        }
                        isCurrentTier={currentTier === SubscriptionTier.Lecture}
                    />
                </Grid>
            )}

            {tiers.includes(SubscriptionTier.GameReview) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        tier={SubscriptionTier.GameReview}
                        icon={<Troubleshoot sx={{ fontSize: 28 }} />}
                        name={t('gameReviewTierName')}
                        price={{
                            fullValue:
                                interval === 'year'
                                    ? priceData[SubscriptionTier.GameReview].month
                                    : undefined,
                            value: priceData[SubscriptionTier.GameReview][interval],
                            symbol: priceData.symbol,
                            interval:
                                interval === 'year'
                                    ? t('intervalMonthWithAsterisk')
                                    : t('intervalMonth'),
                        }}
                        sellingPoints={[
                            {
                                description: t('gameReviewEverythingFromPrevious'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('gameReviewPersonalizedReview'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('gameReviewDirectFeedback'),
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: t('gameReviewRecordings'),
                                status: SellingPointStatus.Included,
                            },
                        ]}
                        buttonProps={{
                            loading:
                                request?.isLoading() &&
                                selectedTier === SubscriptionTier.GameReview,
                            disabled:
                                request?.isLoading() &&
                                selectedTier !== SubscriptionTier.GameReview,
                            onClick: () =>
                                onSubscribe(SubscriptionTier.GameReview, 'month', {
                                    currency,
                                    value: priceData[SubscriptionTier.Lecture][interval],
                                }),
                            children: t('getSenseiFeedback'),
                        }}
                        beforeButton={
                            <Typography>
                                {t.rich('faqClassCalendar', {
                                    faqLink: (chunks) => (
                                        <Link target='_blank' href='/help?id=live-classes'>
                                            {chunks}
                                        </Link>
                                    ),
                                    calendarLink: (chunks) => (
                                        <Link
                                            target='_blank'
                                            href={`/calendar?sessions=${JSON.stringify([CalendarSessionType.Lectures, CalendarSessionType.GameReviews])}&types=[]&tournaments=[]`}
                                        >
                                            {chunks}
                                        </Link>
                                    ),
                                })}
                            </Typography>
                        }
                        isCurrentTier={currentTier === SubscriptionTier.GameReview}
                    />
                </Grid>
            )}
        </>
    );
}

export default PriceMatrix;

function PriceCard({
    tier,
    icon,
    name,
    price,
    sellingPoints,
    buttonProps,
    beforeButton,
    isCurrentTier,
}: {
    tier: SubscriptionTier;
    icon: ReactNode;
    name: string;
    price: {
        fullValue?: number;
        value: number;
        symbol: string;
        interval: string;
        subtitle?: string;
    };
    sellingPoints: SellingPointProps[];
    buttonProps: ButtonProps;
    beforeButton?: JSX.Element;
    isCurrentTier: boolean;
}) {
    const t = useTranslations('upsell.priceMatrix');
    const theme = useTheme();
    return (
        <Card variant='outlined' sx={cardAccentSx(theme, tier)}>
            <CardContent sx={{ height: 1, pt: 3 }}>
                <Stack
                    spacing={3}
                    sx={{
                        alignItems: 'center',
                        height: 1,
                    }}
                >
                    <Stack
                        sx={{
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Box
                                aria-hidden
                                sx={(theme) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 40,
                                    height: 40,
                                    flexShrink: 0,
                                    borderRadius: '50%',
                                    color: accentColor(tier),
                                    bgcolor: alpha(
                                        accentColor(tier),
                                        theme.palette.mode === 'dark' ? 0.22 : 0.16,
                                    ),
                                })}
                            >
                                {icon}
                            </Box>
                            <Typography
                                variant='h5'
                                sx={{
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                }}
                            >
                                {name}
                            </Typography>
                        </Stack>

                        <Typography variant='h5'>
                            {price.fullValue && (
                                <Typography
                                    variant='h5'
                                    component='span'
                                    sx={{
                                        color: 'text.secondary',
                                        textDecoration: 'line-through',
                                        verticalAlign: 'middle',
                                    }}
                                >
                                    {price.symbol}
                                    {Math.round(price.fullValue * 100) / 100}
                                </Typography>
                            )}

                            <Typography
                                variant='h5'
                                component='span'
                                color={price.fullValue ? 'success' : undefined}
                            >
                                {' '}
                                {price.symbol}
                                {Math.round(price.value * 100) / 100}
                            </Typography>

                            {price.interval && (
                                <Typography variant='h6' component='span'>
                                    {' '}
                                    / {price.interval}
                                </Typography>
                            )}
                        </Typography>

                        <Typography
                            variant='h6'
                            sx={{
                                mt: -1,
                                color: 'text.secondary',
                                whiteSpace: 'pre',
                            }}
                        >
                            {price.subtitle}
                        </Typography>
                    </Stack>

                    <Stack
                        spacing={1}
                        sx={{
                            flexGrow: 1,
                        }}
                    >
                        {sellingPoints.map((sp) => (
                            <SellingPoint key={sp.description} {...sp} />
                        ))}
                    </Stack>

                    {beforeButton}

                    {isCurrentTier ? (
                        <Button variant='contained' fullWidth disabled>
                            {t('alreadySubscribed')}
                        </Button>
                    ) : (
                        <Button variant='contained' fullWidth color='subscribe' {...buttonProps} />
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
