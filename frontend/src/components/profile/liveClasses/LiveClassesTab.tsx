import { useEvents } from '@/api/cache/Cache';
import { getGameReviewCohort } from '@/api/liveClassesApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { getConfig } from '@/config';
import { Event, EventType } from '@/database/event';
import { User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { GameReviewCohort } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect } from 'react';
import { datetime, RRule } from 'rrule';
import { GameReviewCohortQueue } from './GameReviewCohortQueue';

export function LiveClassesTab({ user }: { user: User }) {
    return (
        <Stack spacing={8}>
            {getSubscriptionTier(user) === SubscriptionTier.GameReview && (
                <GameReviewSection user={user} />
            )}
            <WorkshopsSection />
        </Stack>
    );
}

function GameReviewSection({ user }: { user: User }) {
    const t = useTranslations('profile.liveClassesTab');
    const request = useRequest<GameReviewCohort>();

    useEffect(() => {
        if (!request.isSent() && user.gameReviewCohortId) {
            request.onStart();
            getGameReviewCohort({ id: user.gameReviewCohortId })
                .then((resp) => {
                    request.onSuccess(resp.data.gameReviewCohort);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    }, [request, user.gameReviewCohortId]);

    if (!user.gameReviewCohortId) {
        return (
            <Stack>
                <Typography>{t('notAssignedYet')}</Typography>
            </Stack>
        );
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (!request.data) {
        return <RequestSnackbar request={request} />;
    }

    const gameReviewCohort = request.data;
    return (
        <Stack>
            <Typography variant='h5'>
                {t('gameReviewHeader', { name: gameReviewCohort.name })}
            </Typography>
            <Divider />

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('discord')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('discordCommunication', {
                    name: gameReviewCohort.name,
                    link: (chunks: ReactNode) => (
                        <Link
                            target='_blank'
                            href={`https://discord.com/channels/${getConfig().discord.guildId}/${gameReviewCohort.discordChannelId}`}
                        >
                            {chunks}
                        </Link>
                    ),
                    settings: (chunks: ReactNode) => (
                        <Link target='_blank' href='/profile/edit'>
                            {chunks}
                        </Link>
                    ),
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('classes')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('classesMethod', {
                    b: (chunks: ReactNode) => <b>{chunks}</b>,
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('joiningClasses')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('joiningClassesText', {
                    link: (chunks: ReactNode) => <Link href='/calendar'>{chunks}</Link>,
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('recordings')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('recordingsText', {
                    link: (chunks: ReactNode) => <Link href='/learn/live-classes'>{chunks}</Link>,
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('scoreboard')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('scoreboardText', {
                    link: (chunks: ReactNode) => (
                        <Link href={`/clubs/${gameReviewCohort.id}`}>{chunks}</Link>
                    ),
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('reviewQueue')}
            </Typography>
            <Typography
                color='textSecondary'
                sx={{
                    mb: 3,
                }}
            >
                {t('reviewQueueText')}
            </Typography>

            <GameReviewCohortQueue
                gameReviewCohort={gameReviewCohort}
                setGameReviewCohort={request.onSuccess}
            />
        </Stack>
    );
}

function WorkshopsSection() {
    const t = useTranslations('profile.liveClassesTab');
    const { user } = useAuth();
    const { events } = useEvents();
    const now = new Date();
    const nextEvents = events
        .filter((e) => e.type === EventType.LectureTier && e.rrule)
        .map((e) => {
            const rrule = RRule.fromString(e.rrule || '');
            const date = rrule.after(
                datetime(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()),
                true,
            );
            return {
                event: e,
                nextDate: date,
            };
        })
        .filter((e) => e.nextDate)
        .sort((lhs, rhs) => (lhs.nextDate?.getTime() ?? 0) - (rhs.nextDate?.getTime() ?? 0)) as {
        event: Event;
        nextDate: Date;
    }[];

    return (
        <Stack>
            <Typography variant='h5'>{t('lectures')}</Typography>
            <Divider />

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('classes')}
            </Typography>
            <Typography color='textSecondary'>{t('lectureClassesText')}</Typography>

            {nextEvents.map((e) => (
                <Stack
                    key={e.event.id}
                    sx={{
                        mt: 2,
                    }}
                >
                    <Typography
                        variant='subtitle1'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        <Link href={`/meeting/${e.event.id}`}>{e.event.title}</Link>
                    </Typography>
                    <Typography>
                        {toDojoDateString(e.nextDate, user?.timezoneOverride)}
                        {' • '}
                        {toDojoTimeString(e.nextDate, user?.timezoneOverride, user?.timeFormat)}
                    </Typography>
                </Stack>
            ))}

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('joiningClasses')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('lectureJoiningText', {
                    link: (chunks: ReactNode) => <Link href='/calendar'>{chunks}</Link>,
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('recordings')}
            </Typography>
            <Typography color='textSecondary'>
                {t.rich('lectureRecordingsText', {
                    link: (chunks: ReactNode) => <Link href='/learn/live-classes'>{chunks}</Link>,
                })}
            </Typography>

            <Typography
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('communicatingPeers')}
            </Typography>
            <Typography color='textSecondary'>{t('communicatingPeersText')}</Typography>
        </Stack>
    );
}
