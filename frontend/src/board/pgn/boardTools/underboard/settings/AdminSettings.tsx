import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { ONE_WEEK_IN_MS } from '@/components/time/time';
import { displayGameReviewType, Game } from '@/database/game';
import Avatar from '@/profile/Avatar';
import { Button, Stack, Typography } from '@mui/material';

interface AdminSettingsProps {
    game: Game;
    onSaveGame?: (g: Game) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ game, onSaveGame }) => {
    return (
        <Stack spacing={1}>
            <Typography variant='h5'>Admin Settings</Typography>
            <GameReviewDetails game={game} onSaveGame={onSaveGame} />
        </Stack>
    );
};

const GameReviewDetails: React.FC<AdminSettingsProps> = ({ game, onSaveGame }) => {
    const user = useAuth().user;
    const request = useRequest();
    const api = useApi();

    const requestDate = new Date(game.reviewRequestedAt || '');
    const requestDateStr = toDojoDateString(requestDate, user?.timezoneOverride);
    const requestTimeStr = toDojoTimeString(requestDate, user?.timezoneOverride, user?.timeFormat);
    const reviewDeadline = toDojoDateString(
        new Date(requestDate.getTime() + ONE_WEEK_IN_MS),
        user?.timezoneOverride,
    );

    if (game.review?.reviewedAt) {
        const review = game.review;
        const reviewDate = new Date(review.reviewedAt || '');
        const reviewDateStr = toDojoDateString(reviewDate, user?.timezoneOverride);
        const reviewTimeStr = toDojoTimeString(
            reviewDate,
            user?.timezoneOverride,
            user?.timeFormat,
        );

        return (
            <Stack spacing={2}>
                <Stack>
                    <Stack direction='row' spacing={1}>
                        <Typography>Reviewer:</Typography>

                        <Avatar
                            size={25}
                            username={review.reviewer?.username}
                            displayName={review.reviewer?.displayName}
                        />
                        <Link href={`/profile/${review.reviewer?.username}`}>
                            {review.reviewer?.displayName} ({review.reviewer?.cohort})
                        </Link>
                    </Stack>
                    <Typography>
                        Date Reviewed: {reviewDateStr} • {reviewTimeStr}
                    </Typography>
                    {game.reviewRequestedAt && (
                        <Typography>
                            Date Requested: {requestDateStr} • {requestTimeStr}
                        </Typography>
                    )}
                    {review.type && (
                        <Typography>Review Type: {displayGameReviewType(review.type)}</Typography>
                    )}
                </Stack>
                <RequestSnackbar request={request} />
            </Stack>
        );
    }

    const onClick = () => {
        request.onStart();
        api.markReviewed(game.cohort, game.id)
            .then((resp) => {
                request.onSuccess();
                onSaveGame?.(resp.data);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={2}>
            {game.review && (
                <Stack>
                    <Typography>
                        Review Requested: {requestDateStr} • {requestTimeStr}
                    </Typography>
                    <Typography>Review Type: {displayGameReviewType(game.review.type)}</Typography>
                    <Typography>Estimated Review Date: by {reviewDeadline}</Typography>
                </Stack>
            )}
            <Button loading={request.isLoading()} variant='contained' onClick={onClick}>
                Mark Reviewed
            </Button>
            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default AdminSettings;
