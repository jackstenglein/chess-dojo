'use client';

import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Graduation } from '@/database/graduation';
import { Link } from '@/i18n/navigation';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface GraduationLinkCardProps {
    graduation: Graduation;
    to: string;
}

export const GraduationLinkCard = ({ graduation, to }: GraduationLinkCardProps) => {
    const t = useTranslations('graduations.linkCard');
    const { newCohort, displayName, createdAt: graduatedAt } = graduation;

    const dateStr = toDojoDateString(new Date(graduatedAt), undefined);
    const timeStr = toDojoTimeString(new Date(graduatedAt), undefined, undefined);

    return (
        <Grid
            size={{
                xs: 12,
                sm: 6,
            }}
        >
            <Card sx={{ height: 1 }}>
                <CardActionArea component={Link} sx={{ height: 1 }} href={to}>
                    <CardContent>
                        <Stack
                            spacing={2}
                            sx={{
                                height: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <CohortIcon cohort={newCohort} size={100} color='primary' />
                            <Typography variant='h5'>{displayName}</Typography>
                            <Typography
                                variant='subtitle1'
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: '1.3',
                                }}
                            >
                                <div>{t('graduatedTo', { cohort: newCohort })}</div>
                                <div>
                                    {dateStr} • {timeStr}
                                </div>
                            </Typography>
                        </Stack>
                    </CardContent>
                </CardActionArea>
            </Card>
        </Grid>
    );
};
