'use client';

import { Link } from '@/components/navigation/Link';
import { CalendarSessionType } from '@/database/event';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    Button,
    ButtonProps,
    Card,
    CardContent,
    Grid,
    GridProps,
    Stack,
    Typography,
} from '@mui/material';
import { JSX, useSyncExternalStore } from 'react';
import { Request } from '../api/Request';
import SellingPoint, { SellingPointProps, SellingPointStatus } from './SellingPoint';
import { getCurrency } from './locales';

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
            year: 75,
        },
        [SubscriptionTier.GameReview]: {
            month: 200,
            year: 200,
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
            year: 65,
        },
        [SubscriptionTier.GameReview]: {
            month: 170,
            year: 170,
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
            year: 55,
        },
        [SubscriptionTier.GameReview]: {
            month: 150,
            year: 150,
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
            year: 3250,
        },
        [SubscriptionTier.GameReview]: {
            month: 17925,
            year: 17925,
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
                        name='Free Tier'
                        price={{
                            value: 0,
                            symbol: priceData.symbol,
                            interval: '',
                            subtitle: ' ',
                        }}
                        sellingPoints={[
                            {
                                description: 'Limited training plans, 0-2500',
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: 'Limited game database',
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: 'Limited puzzles',
                                status: SellingPointStatus.Restricted,
                            },
                            {
                                description: 'Opening courses',
                                status: SellingPointStatus.Excluded,
                            },
                            {
                                description: 'Community forum access',
                                status: SellingPointStatus.Excluded,
                            },
                        ]}
                        buttonProps={{
                            disabled: request?.isLoading(),
                            onClick: onFreeTier,
                            children: 'Continue for Free',
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
                        name='Core'
                        price={{
                            fullValue:
                                interval === 'year'
                                    ? priceData[SubscriptionTier.Basic].month
                                    : undefined,
                            value: priceData[SubscriptionTier.Basic][interval],
                            symbol: priceData.symbol,
                            interval: `month${interval === 'year' ? '*' : ''}`,
                            subtitle: ' ',
                        }}
                        sellingPoints={[
                            {
                                description: 'All training plans, 0-2500',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Rating dashboard & progress tracking',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Full game database',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Unlimited puzzles',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'All opening courses',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Community forum access',
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
                            children: 'Start Training',
                        }}
                        isCurrentTier={currentTier === SubscriptionTier.Basic}
                    />
                </Grid>
            )}

            {tiers.includes(SubscriptionTier.Lecture) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        name='Lectures'
                        price={{
                            value: priceData[SubscriptionTier.Lecture][interval],
                            symbol: priceData.symbol,
                            interval: `month`,
                            subtitle: `(~ ${priceData.symbol}${Math.round(priceData[SubscriptionTier.Lecture][interval] / 15)} / class)`,
                        }}
                        sellingPoints={[
                            {
                                description: 'Everything from ChessDojo Core',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Weekly live lectures on specialized topics',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Q&A sessions with Dojo coaches',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Structured homework assignments',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Access to recordings of all lectures',
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
                            children: 'Join Lectures',
                        }}
                        beforeButton={
                            <Typography>
                                <Link target='_blank' href='/help?id=live-classes'>
                                    FAQ
                                </Link>
                                {' / '}
                                <Link
                                    target='_blank'
                                    href={`/calendar?sessions=${JSON.stringify([CalendarSessionType.Lectures])}&types=[]&tournaments=[]`}
                                >
                                    Class Calendar
                                </Link>
                            </Typography>
                        }
                        isCurrentTier={currentTier === SubscriptionTier.Lecture}
                    />
                </Grid>
            )}

            {tiers.includes(SubscriptionTier.GameReview) && (
                <Grid size={getGridSize(cardCount)}>
                    <PriceCard
                        name='Game & Profile Review'
                        price={{
                            value: priceData[SubscriptionTier.GameReview][interval],
                            symbol: priceData.symbol,
                            interval: 'month',
                            subtitle: `(~ ${priceData.symbol}${Math.round(priceData[SubscriptionTier.GameReview][interval] / 20)} / class)`,
                        }}
                        sellingPoints={[
                            {
                                description: 'Everything from previous tiers',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Personalized game review classes',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Direct feedback from a sensei',
                                status: SellingPointStatus.Included,
                            },
                            {
                                description: 'Access to recordings of all lectures and classes',
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
                            children: 'Get Sensei Feedback',
                        }}
                        beforeButton={
                            <Typography>
                                <Link target='_blank' href='/help?id=live-classes'>
                                    FAQ
                                </Link>
                                {' / '}
                                <Link
                                    target='_blank'
                                    href={`/calendar?sessions=${JSON.stringify([CalendarSessionType.Lectures, CalendarSessionType.GameReviews])}&types=[]&tournaments=[]`}
                                >
                                    Class Calendar
                                </Link>
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
    name,
    price,
    sellingPoints,
    buttonProps,
    beforeButton,
    isCurrentTier,
}: {
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
    return (
        <Card variant='outlined' sx={{ height: 1 }}>
            <CardContent sx={{ height: 1 }}>
                <Stack alignItems='center' spacing={3} height={1}>
                    <Stack alignItems='center' gap={1}>
                        <Typography
                            variant='h6'
                            fontWeight='bold'
                            color='text.secondary'
                            textAlign='center'
                        >
                            {name}
                        </Typography>

                        <Typography variant='h4'>
                            {price.fullValue && (
                                <Typography
                                    variant='h5'
                                    component='span'
                                    sx={{ textDecoration: 'line-through', verticalAlign: 'middle' }}
                                    color='text.secondary'
                                >
                                    {price.symbol}
                                    {Math.round(price.fullValue * 100) / 100}
                                </Typography>
                            )}

                            <Typography
                                variant='h4'
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

                        <Typography variant='h6' mt={-1} color='text.secondary' whiteSpace='pre'>
                            {price.subtitle}
                        </Typography>
                    </Stack>

                    <Stack spacing={1} flexGrow={1}>
                        {sellingPoints.map((sp) => (
                            <SellingPoint key={sp.description} {...sp} />
                        ))}
                    </Stack>

                    {beforeButton}

                    {isCurrentTier ? (
                        <Button variant='contained' fullWidth disabled>
                            Already Subscribed
                        </Button>
                    ) : (
                        <Button variant='contained' fullWidth color='subscribe' {...buttonProps} />
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
