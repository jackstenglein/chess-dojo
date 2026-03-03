import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { Event, EventType } from '@/database/event';
import { User } from '@/database/user';
import { UpsellButton } from '@/upsell/UpsellButton';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Button, Stack, Typography } from '@mui/material';
import Field from './Field';
import OwnerField from './OwnerField';

export function LiveClassViewer({ processedEvent }: { processedEvent: ProcessedEvent }) {
    const event = processedEvent.event as Event;

    return (
        <Stack data-testid='live-class-viewer' sx={{ pt: 2 }} spacing={2}>
            <Typography>{event.title}</Typography>

            <OwnerField title='Sensei' event={event} />
            <Field title='Location' body={event.location} iconName='location' />
            <Field title='Description' body={event.description} iconName='notes' />

            {event.type === EventType.GameReviewTier && <GameReviewActions event={event} />}
            {event.type === EventType.LectureTier && <LectureActions event={event} />}
        </Stack>
    );
}

/** Renders actions for GameReviewTier events */
function GameReviewActions({ event }: { event: Event }) {
    const { user } = useAuth();

    if (isParticipant(user, event)) {
        // The user is in the game review cohort for this event (or is the sensei)
        return (
            <>
                <Button variant='contained' href={`/meeting/${event.id}`}>
                    View Details
                </Button>
                <Button variant='contained' href={event.location} target='_blank'>
                    Join on Google Meet
                </Button>
                <Button variant='outlined' href='/learn/live-classes' LinkComponent={Link}>
                    Watch Recordings
                </Button>
            </>
        );
    }

    if (getSubscriptionTier(user) === SubscriptionTier.GameReview) {
        // The user is in a different game review cohort, so should only be able to view
        // recordings for this event.
        return (
            <Button variant='outlined' href='/learn/live-classes' LinkComponent={Link}>
                Watch Recordings
            </Button>
        );
    }

    // The user is not in the game review tier, so must upgrade if they want to do anything
    // with this event.
    return (
        <UpsellButton
            buttonProps={{
                children: 'Join Class',
                variant: 'contained',
            }}
            dialogProps={{
                title: 'Upgrade to Access All Live Classes',
                description: `Your current plan doesn't provide access to this class. Upgrade to:`,
                postscript: `Your progress on your current training plan will carry over when you upgrade`,
                currentAction: 'Attend weekly personalized game review classes',
                bulletPoints: [
                    'Get direct feedback from a sensei',
                    'Attend weekly live group classes on specialized topics',
                    'Access recordings of all Game & Profile Review classes',
                    'Get full access to the ChessDojo website',
                ],
            }}
        />
    );
}

/** Renders actions for LectureTier events. */
function LectureActions({ event }: { event: Event }) {
    const { user } = useAuth();
    if (isParticipant(user, event)) {
        return (
            <>
                <Button variant='contained' href={`/meeting/${event.id}`}>
                    View Details
                </Button>
                <Button variant='contained' href={event.location} target='_blank'>
                    Join on Google Meet
                </Button>
                <Button variant='outlined' href='/learn/live-classes' LinkComponent={Link}>
                    Watch Recordings
                </Button>
            </>
        );
    }

    // The user is on the basic or free tiers and must upgrade if they want to do anything with
    // this event.
    return (
        <UpsellButton
            buttonProps={{
                children: 'Join Class',
                variant: 'contained',
            }}
            dialogProps={{
                title: 'Upgrade to Access Lecture Classes',
                description: `Your current plan doesn't provide access to this class. Upgrade to:`,
                postscript: `Your progress on your current training plan will carry over when you upgrade.`,
                currentAction: 'Attend weekly lecture classes on specialized topics',
                bulletPoints: [
                    'Access structured homework assignments',
                    'Access recordings of lecture classes',
                    'Get full access to the ChessDojo website',
                ],
            }}
        />
    );
}

/**
 * Returns true if the given user is a participant of the given event, which is assumed
 * to be either a GameReviewTier or LectureTier event.
 */
function isParticipant(user: User | undefined, event: Event): boolean {
    if (!user) {
        return false;
    }
    if (user.isAdmin) {
        return true;
    }
    if (event.owner === user.username) {
        return true;
    }
    if (event.type === EventType.GameReviewTier) {
        return event.gameReviewCohortId === user.gameReviewCohortId;
    }
    const subscriptionTier = getSubscriptionTier(user);
    return (
        subscriptionTier === SubscriptionTier.Lecture ||
        subscriptionTier === SubscriptionTier.GameReview
    );
}
