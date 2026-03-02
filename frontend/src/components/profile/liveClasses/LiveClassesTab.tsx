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
import { useEffect } from 'react';
import { datetime, RRule } from 'rrule';
import { GameReviewCohortQueue } from './GameReviewCohortQueue';

export function LiveClassesTab({ user }: { user: User }) {
    return (
        <Stack spacing={8}>
            {getSubscriptionTier(user) === SubscriptionTier.GameReview && (
                <GameReviewSection user={user} />
            )}
            <LectureSection />
        </Stack>
    );
}

function GameReviewSection({ user }: { user: User }) {
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
                <Typography>
                    This user has not been assigned to a Game & Profile Review cohort yet. Check
                    back later!
                </Typography>
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
            <Typography variant='h5'>Game & Profile Review — {gameReviewCohort.name}</Typography>
            <Divider />

            <Typography variant='h6' mt={2}>
                Discord
            </Typography>
            <Typography color='textSecondary'>
                Communicate with the other members of {gameReviewCohort.name} in Discord{' '}
                <Link
                    target='_blank'
                    href={`https://discord.com/channels/${getConfig().discord.guildId}/${gameReviewCohort.discordChannelId}`}
                >
                    here
                </Link>
                . If you are unable to access the channel, make sure you have linked your Discord
                account in your{' '}
                <Link target='_blank' href='/profile/edit'>
                    settings
                </Link>{' '}
                or try disconnecting and reconnecting your Discord account.
            </Typography>

            <Typography variant='h6' mt={2}>
                Classes
            </Typography>
            <Typography color='textSecondary'>
                The method of the Game & Profile Review class is simple. You will meet with your
                group weekly without the sensei. In this <b>peer review session</b>, you will review
                a game (or multiple games if there is time) from the user who is next up in the
                review queue. Try to improve the existing annotations of the game(s) and develop
                some questions about what was going on in the game(s). A few days later, you will
                meet with the sensei and cover the same user. Each <b>sensei session</b> will begin
                with a look at the user's profile. After that, the group will look at the game(s) of
                the user. The sensei will share their perspective on the game and answer the
                questions the students came up with during the peer review session. After the sensei
                session, the covered user moves to the bottom of the review queue and the process
                repeats for the next week.
            </Typography>

            <Typography variant='h6' mt={2}>
                Joining Classes
            </Typography>
            <Typography color='textSecondary'>
                You can find all the Game & Profile Review sessions (as well as the larger group
                classes) on the <Link href='/calendar'>calendar</Link>. All classes will be
                conducted through Google Meet. To join, simply click the meeting link in the event
                details on the calendar. You don't need to download any software ahead of time.
            </Typography>

            <Typography variant='h6' mt={2}>
                Recordings
            </Typography>
            <Typography color='textSecondary'>
                All classes are recorded. You can view the recordings{' '}
                <Link href='/learn/live-classes'>here</Link>. Note that it may take a few hours
                after a class for the recording to be available.
            </Typography>

            <Typography variant='h6' mt={2}>
                Scoreboard
            </Typography>
            <Typography color='textSecondary'>
                You can view the team scoreboard{' '}
                <Link href={`/clubs/${gameReviewCohort.id}`}>here</Link>. Use this to see at a
                glance how much work you and the other members of your team are doing!
            </Typography>

            <Typography variant='h6' mt={2}>
                Review Queue
            </Typography>
            <Typography color='textSecondary' mb={3}>
                Group members are listed in order of who is next up to have their game and profile
                reviewed.
            </Typography>

            <GameReviewCohortQueue
                gameReviewCohort={gameReviewCohort}
                setGameReviewCohort={request.onSuccess}
            />
        </Stack>
    );
}

function LectureSection() {
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
            <Typography variant='h5'>Lectures</Typography>
            <Divider />

            <Typography variant='h6' mt={2}>
                Classes
            </Typography>
            <Typography color='textSecondary'>
                You can join any of the lecture classes, although material will be designed for the
                rating range listed in each class description.
            </Typography>

            {nextEvents.map((e) => (
                <Stack key={e.event.id} mt={2}>
                    <Typography variant='subtitle1' fontWeight='bold'>
                        <Link href={`/meeting/${e.event.id}`}>{e.event.title}</Link>
                    </Typography>
                    <Typography>
                        {toDojoDateString(e.nextDate, user?.timezoneOverride)}
                        {' • '}
                        {toDojoTimeString(e.nextDate, user?.timezoneOverride, user?.timeFormat)}
                    </Typography>
                </Stack>
            ))}

            <Typography variant='h6' mt={2}>
                Joining Classes
            </Typography>
            <Typography color='textSecondary'>
                You can find all the classes on the <Link href='/calendar'>calendar</Link>. All
                classes will be conducted through Google Meet. To join, simply click the meeting
                link in the event details on the calendar. You don't need to download any software
                ahead of time.
            </Typography>

            <Typography variant='h6' mt={2}>
                Recordings
            </Typography>
            <Typography color='textSecondary'>
                All classes are recorded. You can view the recordings{' '}
                <Link href='/learn/live-classes'>here</Link>. Note that it may take a few hours
                after a class for the recording to be available.
            </Typography>

            <Typography variant='h6' mt={2}>
                Communicating with Peers
            </Typography>
            <Typography color='textSecondary'>
                Each class has its own Discord channel to handle organizational questions and to
                allow you to discuss with your peers. For example, we will use these channels to
                share sparring positions and you can schedule with other players to play them. You
                can find these channels in the event details on the calendar.
            </Typography>
        </Stack>
    );
}
