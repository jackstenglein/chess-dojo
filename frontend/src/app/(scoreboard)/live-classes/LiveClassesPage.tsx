'use client';

import { useEvents } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { Event, EventType } from '@/database/event';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    CardHeader,
    Container,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import Image from 'next/image';
import { datetime, RRule } from 'rrule';
import { liveClassesFaq } from '../help/liveClasses';
import scheduleImage from './schedule.webp';

export default function LiveClassesPage() {
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);
    const isGameReviewUser = subscriptionTier === SubscriptionTier.GameReview;
    const isLiveClassUser = isGameReviewUser || subscriptionTier === SubscriptionTier.Lecture;

    const { events } = useEvents();
    const now = new Date();
    const lectureEvents = events
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
        <Container sx={{ py: 5 }}>
            <Typography variant='h4' fontWeight='bold'>
                Live Classes
            </Typography>

            <Typography variant='h6' mt={2}>
                ChessDojo offers two live class tiers: the Lecture Tier and the Game & Profile
                Review Tier. The Lecture Tier provides access to larger lecture-style classes on
                various topics like endgames, calculation, and openings. The Game & Profile Review
                tier provides access to smaller seminar-style classes. In these classes, the sensei
                reviews one player's game and profile each week. The highlighted player rotates each
                week.
            </Typography>

            <Stack alignItems='center' mt={3}>
                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: 4,
                        overflow: 'hidden',
                        width: { xs: 1, sm: 0.7, md: 0.5 },
                        aspectRatio: 1,
                    }}
                >
                    <Image src={scheduleImage} alt='' fill style={{ objectFit: 'contain' }} />
                </Box>
            </Stack>

            <Typography variant='h5' mt={4} fontWeight='bold'>
                Lectures
            </Typography>
            <Typography variant='h6' mt={2}>
                The Lecture Tier provides access to larger lecture-style classes on various topics
                like endgames, calculation, and openings. For $75/month, you get access to all
                lecture classes and recordings, as well as full access to the rest of the ChessDojo
                website.
            </Typography>

            {!isLiveClassUser && (
                <Button href='/prices' component={Link} variant='contained' sx={{ mt: 2 }}>
                    Join Lecture Tier
                </Button>
            )}

            <Grid container mt={4} spacing={3}>
                {lectureEvents.map((e) => (
                    <Grid key={e.event.id} size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardActionArea
                                href={isLiveClassUser ? `/meeting/${e.event.id}` : '/prices'}
                                component={Link}
                            >
                                <CardHeader
                                    title={e.event.title}
                                    subheader={`Next Meeting: ${toDojoDateString(e.nextDate, user?.timezoneOverride)} • ${toDojoTimeString(e.nextDate, user?.timezoneOverride, user?.timeFormat)}`}
                                />
                                <CardContent>
                                    <Typography>{e.event.description}</Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Typography variant='h5' mt={8} fontWeight='bold'>
                Game & Profile Review
            </Typography>
            <Typography variant='h6' mt={2}>
                The Game & Profile Review tier provides access to smaller seminar-style classes. In
                these classes, the sensei reviews one player's game and profile each week. The
                highlighted player rotates each week. For $200/month, you get placed with a team of
                similarly rated players and access to weekly peer review and sensei review sessions
                with your team. You also get access to all lecture classes, as well as recordings
                from all lecture classes and the peer review and sensei review sessions of all game
                review teams.
            </Typography>
            <Button
                href={isGameReviewUser ? '/profile?view=classes' : '/prices'}
                component={Link}
                variant='contained'
                sx={{ mt: 2 }}
            >
                {isGameReviewUser ? 'View Game Review Team' : 'Join Game & Profile Review'}
            </Button>

            <Typography variant='h5' mt={8} fontWeight='bold'>
                Recordings
            </Typography>
            <Typography variant='h6' mt={2}>
                {isLiveClassUser ? (
                    <>
                        All recordings can be found <Link href='/learn/live-classes'>here</Link>.
                    </>
                ) : (
                    <>All classes are recorded and available for viewing on demand.</>
                )}
            </Typography>

            <Typography variant='h4' mt={8}>
                FAQs
            </Typography>
            {liveClassesFaq.items.map((item) => (
                <Stack key={item.title} mt={3}>
                    <Typography variant='h5' fontWeight='bold'>
                        {item.title}
                    </Typography>
                    <Typography variant='h6'>{item.content}</Typography>
                </Stack>
            ))}
        </Container>
    );
}
