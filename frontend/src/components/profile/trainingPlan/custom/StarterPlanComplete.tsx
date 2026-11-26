import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import {
    Checklist,
    EditNote,
    Groups,
    RateReview,
    School,
    TrendingUp,
    Whatshot,
    WorkspacePremium,
} from '@mui/icons-material';
import { alpha, Box, Button, Card, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { FreePlanSwitch } from './FreePlanSwitch';
import { useFreePlanEditor } from './useFreePlanEditor';

/**
 * The average rating change since joining of active subscribers (updated in the past
 * month), from the public user statistics (2026-11-24): 115,903 points over 862 members.
 */
export const AVERAGE_RATING_GAIN = 134;

/**
 * Shown on the Dojo Plan tab once a free-tier user has finished the starter
 * plan: what the full program unlocks, or building their own plan for free.
 */
export function StarterPlanComplete({
    cohort,
    lockedCount,
}: {
    cohort: string;
    /** The number of tasks in the cohort's plan that joining unlocks. */
    lockedCount: number;
}) {
    const t = useTranslations('profile.trainingPlan.freePlan');
    const tStats = useTranslations('landing.hero.stats');
    const { createPlan } = useFreePlanEditor();

    const stats: StatTileProps[] = [
        {
            icon: <TrendingUp />,
            color: '#4ce06a',
            value: `+${AVERAGE_RATING_GAIN}`,
            label: t('statAverageGain'),
            detail: t('statAverageGainDetail'),
            detailIcon: <Checklist />,
        },
        {
            icon: <Whatshot />,
            color: '#f7941f',
            value: tStats('ratingPoints.value'),
            label: t('statTotalPoints'),
            detail: t('statTotalPointsDetail'),
            detailIcon: <Groups />,
        },
        {
            icon: <School />,
            color: '#b388ff',
            value: tStats('graduations.value'),
            label: t('statGraduations'),
            detail: t('statGraduationsDetail'),
            detailIcon: <RateReview />,
        },
    ];

    return (
        <Card
            variant='outlined'
            sx={{ width: 1, borderRadius: 3, p: { xs: 2.5, sm: 3 } }}
            data-testid='starter-plan-complete'
        >
            <Stack spacing={2}>
                <Stack spacing={1} sx={{ alignItems: 'start' }}>
                    <Stack
                        direction='row'
                        sx={{ width: 1, alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
                    >
                        <ChessDojoIcon
                            sx={{ fontSize: { xs: '2rem', sm: '2.25rem' }, color: 'primary.main' }}
                        />
                        <Typography
                            variant='h4'
                            sx={{ fontWeight: 'bold', fontSize: { xs: '1.6rem', md: '1.85rem' } }}
                        >
                            {t('completeTitle')}
                        </Typography>
                        <FreePlanSwitch />
                    </Stack>
                    <Typography sx={{ color: 'text.secondary', maxWidth: 640 }}>
                        {t('completeBody')}
                    </Typography>
                </Stack>

                <Grid container spacing={1.5}>
                    {stats.map((stat) => (
                        <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
                            <StatTile {...stat} />
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <OptionCard
                            highlighted
                            icon={<WorkspacePremium color='primary' />}
                            title={t('fullProgramTitle')}
                            body={t('fullProgramBody', { count: lockedCount, cohort })}
                            bullets={[
                                t('fullProgramBullet1'),
                                t('fullProgramBullet2'),
                                t('fullProgramBullet3'),
                                t('fullProgramBullet4'),
                            ]}
                            action={
                                <Button
                                    variant='contained'
                                    href='/prices'
                                    fullWidth
                                    data-testid='starter-join-button'
                                >
                                    {t('joinCta')}
                                </Button>
                            }
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <OptionCard
                            icon={<EditNote color='action' />}
                            title={t('customOptionTitle')}
                            body={t('customOptionBody')}
                            bullets={[
                                t('customOptionBullet1'),
                                t('customOptionBullet2'),
                                t('customOptionBullet3'),
                            ]}
                            action={
                                <Button
                                    variant='outlined'
                                    onClick={createPlan}
                                    fullWidth
                                    data-testid='starter-build-own-button'
                                >
                                    {t('buildOwnCta')}
                                </Button>
                            }
                        />
                    </Grid>
                </Grid>
            </Stack>
        </Card>
    );
}

interface StatTileProps {
    icon: ReactNode;
    /** The tile's accent color, as a hex string. */
    color: string;
    value: string;
    label: string;
    /** A highlight line at the bottom of the tile, in the accent color. */
    detail: string;
    detailIcon: ReactNode;
}

/** A headline number with an icon, tinted in its accent color. */
function StatTile({ icon, color, value, label, detail, detailIcon }: StatTileProps) {
    return (
        <Stack
            spacing={1}
            sx={{
                height: 1,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: 1,
                borderColor: alpha(color, 0.35),
                background: `linear-gradient(135deg, ${alpha(color, 0.16)} 0%, ${alpha(color, 0.03)} 70%)`,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color,
                        backgroundColor: alpha(color, 0.18),
                        boxShadow: `0 0 0 4px ${alpha(color, 0.06)}`,
                    }}
                >
                    {icon}
                </Box>
                <Box>
                    <Typography
                        variant='h4'
                        sx={{ fontWeight: 800, color, lineHeight: 1.1, letterSpacing: '-0.02em' }}
                    >
                        {value}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {label}
                    </Typography>
                </Box>
            </Stack>
            {detail && (
                <Stack
                    direction='row'
                    spacing={0.75}
                    sx={{
                        // Lines up the highlight across tiles of different heights.
                        mt: 'auto !important',
                        pt: 0.5,
                        alignItems: 'center',
                        color,
                        '& svg': { fontSize: '1rem' },
                    }}
                >
                    {detailIcon}
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {detail}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
}

function OptionCard({
    icon,
    title,
    body,
    bullets,
    action,
    highlighted,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    bullets: string[];
    action: React.ReactNode;
    highlighted?: boolean;
}) {
    return (
        <Stack
            spacing={1.5}
            sx={{
                height: 1,
                p: 2.5,
                borderRadius: 2,
                border: highlighted ? 2 : 1,
                borderColor: highlighted ? 'primary.main' : 'divider',
            }}
        >
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                {icon}
                <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                    {title}
                </Typography>
            </Stack>
            <Typography sx={{ color: 'text.secondary' }}>{body}</Typography>
            <Stack component='ul' spacing={0.5} sx={{ m: 0, pl: 2.5, flexGrow: 1 }}>
                {bullets.map((b) => (
                    <Typography component='li' key={b} variant='body2'>
                        {b}
                    </Typography>
                ))}
            </Stack>
            {action}
        </Stack>
    );
}
