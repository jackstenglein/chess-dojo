import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { ListGamesResponse } from '@/api/gameApi';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { ONE_WEEK_IN_MS } from '@/components/time/time';
import { Game, GameReviewType, displayGameReviewType } from '@/database/game';
import Avatar from '@/profile/Avatar';
import {
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
    Stack,
    Typography,
} from '@mui/material';
import { AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';

const estimatedReviewDate = new Date(new Date().getTime() + ONE_WEEK_IN_MS);

interface RequestReviewDialogProps {
    /** The game to request a review for. */
    game: Game;
}

const RequestReviewDialog: React.FC<RequestReviewDialogProps> = ({ game }) => {
    const [open, setOpen] = useState(false);
    const onClose = () => setOpen(false);

    return (
        <>
            <Button variant='contained' onClick={() => setOpen(true)}>
                {!game.review
                    ? 'Request Sensei Review'
                    : game.review.reviewedAt
                      ? 'Sensei Review Complete'
                      : 'Sensei Review Pending'}
            </Button>
            <Dialog open={open} onClose={onClose} fullWidth>
                {!game.review ? (
                    <SubmitDialogContent cohort={game.cohort} id={game.id} onClose={onClose} />
                ) : game.review.reviewedAt ? (
                    <CompletedDialogContent game={game} />
                ) : (
                    <PendingDialogContent game={game} />
                )}
            </Dialog>
        </>
    );
};

export default RequestReviewDialog;

/**
 * Renders the dialog content for a game that has not yet been submitted for review.
 */
const SubmitDialogContent: React.FC<{
    cohort: string;
    id: string;
    onClose: () => void;
}> = ({ cohort, id, onClose }) => {
    const user = useAuth().user;
    const [reviewType, setReviewType] = useState<GameReviewType>();
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();
    const queueRequest = useRequest<number>();
    const api = useApi();

    useEffect(() => {
        async function getQueueLength() {
            try {
                let startKey = undefined;
                let length = 0;
                do {
                    const response: AxiosResponse<ListGamesResponse> =
                        await api.listGamesForReview(startKey);
                    length += response.data.games.length;
                    startKey = response.data.lastEvaluatedKey;
                } while (startKey);
                queueRequest.onSuccess(length);
            } catch (err) {
                queueRequest.onFailure(err);
            }
        }

        if (!queueRequest.isSent()) {
            queueRequest.onStart();
            void getQueueLength();
        }
    }, [queueRequest, api, cohort, id]);

    const onPurchase = () => {
        const newErrors: Record<string, string> = {};
        if (!reviewType) {
            newErrors.reviewType = 'This field is required';
        }
        if (!isConfirmed) {
            newErrors.isConfirmed = 'This field is required';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }
        if (!reviewType) {
            return;
        }

        request.onStart();
        api.requestReview(cohort, id, reviewType)
            .then((resp) => {
                window.location.href = resp.data.url;
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <DialogTitle>Submit Game for Review?</DialogTitle>
            <DialogContent>
                <DialogContentText mb={3}>
                    One of the senseis will review this game on a future{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank' rel='noreferrer'>
                        Twitch stream
                    </Link>
                    . If you miss the live stream, you can watch the review in the{' '}
                    <Link
                        href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                        target='_blank'
                        rel='noreferrer'
                    >
                        Twitch VODs
                    </Link>{' '}
                    or on the{' '}
                    <Link
                        href='https://www.youtube.com/@ChessDojoLive'
                        target='_blank'
                        rel='noreferrer'
                    >
                        ChessDojoLive Youtube channel
                    </Link>
                    .
                </DialogContentText>

                <FormControl error={Boolean(errors.reviewType)}>
                    <FormLabel>Review Type</FormLabel>
                    <RadioGroup
                        value={reviewType}
                        onChange={(e) => setReviewType(e.target.value as GameReviewType)}
                    >
                        <FormControlLabel
                            value={GameReviewType.Quick}
                            control={<Radio />}
                            label='Quick - $50 (~15-20 min, recommended for U1600)'
                        />
                        <FormControlLabel
                            value={GameReviewType.Deep}
                            control={<Radio />}
                            label='Deep Dive - $100 (~30-45 min, recommended for 1600+)'
                        />
                    </RadioGroup>
                    <FormHelperText>{errors.reviewType}</FormHelperText>
                </FormControl>

                <FormControl error={Boolean(errors.isConfirmed)}>
                    <FormControlLabel
                        sx={{ mt: 3 }}
                        control={
                            <Checkbox
                                checked={isConfirmed}
                                onChange={(e) => setIsConfirmed(e.target.checked)}
                                sx={{
                                    color:
                                        errors.isConfirmed && !isConfirmed
                                            ? 'error.dark'
                                            : undefined,
                                }}
                            />
                        }
                        slotProps={{
                            typography: {
                                color: errors.isConfirmed && !isConfirmed ? 'error' : undefined,
                            },
                        }}
                        label='I confirm that this game is annotated and that the senseis will skip reviewing unannotated games'
                    />
                </FormControl>

                <Stack mt={5}>
                    <Typography>
                        Current Queue Length:{' '}
                        {queueRequest.isLoading() ? (
                            <CircularProgress size={16} sx={{ ml: 0.5 }} />
                        ) : (
                            queueRequest.data
                        )}
                    </Typography>
                    <Typography>
                        Estimated Review Date: by{' '}
                        {toDojoDateString(estimatedReviewDate, user?.timezoneOverride)}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    Cancel
                </Button>
                <Button loading={request.isLoading()} onClick={onPurchase}>
                    Purchase Review
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </>
    );
};

/**
 * Renders the dialog content for a game whose review has been completed.
 */
const CompletedDialogContent: React.FC<{ game: Game }> = ({ game }) => {
    const user = useAuth().user;

    const review = game.review;
    if (!review) {
        return null;
    }

    const requestDate = new Date(game.reviewRequestedAt || '');
    const requestDateStr = toDojoDateString(requestDate, user?.timezoneOverride);
    const requestTimeStr = toDojoTimeString(requestDate, user?.timezoneOverride, user?.timeFormat);

    const reviewDate = new Date(review.reviewedAt || '');
    const reviewDateStr = toDojoDateString(reviewDate, user?.timezoneOverride);
    const reviewTimeStr = toDojoTimeString(reviewDate, user?.timezoneOverride, user?.timeFormat);

    return (
        <>
            <DialogTitle>Game Review Complete</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Your game review was reviewed on a previous{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank' rel='noreferrer'>
                        Twitch stream
                    </Link>
                    . If you missed the live stream, you can watch the review in the{' '}
                    <Link
                        href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                        target='_blank'
                        rel='noreferrer'
                    >
                        Twitch VODs
                    </Link>{' '}
                    or on the{' '}
                    <Link
                        href='https://www.youtube.com/@ChessDojoLive'
                        target='_blank'
                        rel='noreferrer'
                    >
                        ChessDojoLive Youtube channel
                    </Link>
                    .
                </DialogContentText>

                <Stack mt={3}>
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
            </DialogContent>
        </>
    );
};

/**
 * Renders the dialog content for a game whose review is pending.
 */
const PendingDialogContent: React.FC<{ game: Game }> = ({ game }) => {
    const user = useAuth().user;
    const queueRequest = useRequest<number>();
    const api = useApi();

    const cohort = game.cohort;
    const id = game.id;
    useEffect(() => {
        async function getQueueLength() {
            try {
                let startKey = undefined;
                let length = 0;
                let index = -1;

                do {
                    const response: AxiosResponse<ListGamesResponse> =
                        await api.listGamesForReview(startKey);

                    const i = response.data.games.findIndex(
                        (g) => g.cohort === cohort && g.id === id,
                    );
                    if (i >= 0) {
                        index = length + i + 1;
                        break;
                    }

                    length += response.data.games.length;
                    startKey = response.data.lastEvaluatedKey;
                } while (startKey);

                queueRequest.onSuccess(index);
            } catch (err) {
                queueRequest.onFailure(err);
            }
        }

        if (!queueRequest.isSent()) {
            queueRequest.onStart();
            void getQueueLength();
        }
    }, [queueRequest, api, cohort, id]);

    const date = new Date(game.reviewRequestedAt || '');
    const dateStr = toDojoDateString(date, user?.timezoneOverride);
    const timeStr = toDojoTimeString(date, user?.timezoneOverride, user?.timeFormat);

    const reviewDeadline = toDojoDateString(
        new Date(date.getTime() + ONE_WEEK_IN_MS),
        user?.timezoneOverride,
    );

    return (
        <>
            <DialogTitle>Game Review Pending</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Your game review is still in the queue. One of the senseis will review this game
                    on a future{' '}
                    <Link href='https://www.twitch.tv/chessdojo' target='_blank' rel='noreferrer'>
                        Twitch stream
                    </Link>
                    . If you miss the live stream, you can watch the review in the{' '}
                    <Link
                        href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                        target='_blank'
                        rel='noreferrer'
                    >
                        Twitch VODs
                    </Link>{' '}
                    or on the{' '}
                    <Link
                        href='https://www.youtube.com/@ChessDojoLive'
                        target='_blank'
                        rel='noreferrer'
                    >
                        ChessDojoLive Youtube channel
                    </Link>
                    .
                </DialogContentText>

                <Stack mt={3}>
                    <Typography>
                        Date Requested: {dateStr} • {timeStr}
                    </Typography>
                    {game.review?.type && (
                        <Typography>
                            Review Type: {displayGameReviewType(game.review.type)}
                        </Typography>
                    )}
                    <Typography>
                        Current Position in Queue:{' '}
                        {queueRequest.isLoading() ? (
                            <CircularProgress size={16} sx={{ ml: 0.5 }} />
                        ) : (
                            queueRequest.data
                        )}
                    </Typography>
                    <Typography>Estimated Review Date: by {reviewDeadline}</Typography>
                </Stack>
            </DialogContent>
        </>
    );
};
