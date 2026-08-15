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
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const estimatedReviewDate = new Date(new Date().getTime() + ONE_WEEK_IN_MS);

interface RequestReviewDialogProps {
    /** The game to request a review for. */
    game: Game;
}

const RequestReviewDialog: React.FC<RequestReviewDialogProps> = ({ game }) => {
    const t = useTranslations('analysisBoard.underboard.settings');
    const [open, setOpen] = useState(false);
    const onClose = () => setOpen(false);

    return (
        <>
            <Button variant='contained' onClick={() => setOpen(true)}>
                {!game.review
                    ? t('requestSenseiReviewButton')
                    : game.review.reviewedAt
                      ? t('senseiReviewCompleteButton')
                      : t('senseiReviewPendingButton')}
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
    const t = useTranslations('analysisBoard.underboard.settings');
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
            newErrors.reviewType = t('fieldRequired');
        }
        if (!isConfirmed) {
            newErrors.isConfirmed = t('fieldRequired');
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
            <DialogTitle>{t('submitGameForReviewDialogTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText
                    sx={{
                        mb: 3,
                    }}
                >
                    {t.rich('submitReviewDescription', {
                        stream: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        vods: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        youtube: (chunks) => (
                            <Link
                                href='https://www.youtube.com/@ChessDojoLive'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                    })}
                </DialogContentText>

                <FormControl error={Boolean(errors.reviewType)}>
                    <FormLabel>{t('reviewTypeLabel')}</FormLabel>
                    <RadioGroup
                        value={reviewType}
                        onChange={(e) => setReviewType(e.target.value as GameReviewType)}
                    >
                        <FormControlLabel
                            value={GameReviewType.Quick}
                            control={<Radio />}
                            label={t('reviewTypeQuickLabel')}
                        />
                        <FormControlLabel
                            value={GameReviewType.Deep}
                            control={<Radio />}
                            label={t('reviewTypeDeepLabel')}
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
                        label={t('confirmAnnotatedGameLabel')}
                    />
                </FormControl>

                <Stack
                    sx={{
                        mt: 5,
                    }}
                >
                    <Typography>
                        {t.rich('currentQueueLengthLabel', {
                            value: () =>
                                queueRequest.isLoading() ? (
                                    <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                ) : (
                                    <>{queueRequest.data}</>
                                ),
                        })}
                    </Typography>
                    <Typography>
                        {t('estimatedReviewDateLabel', {
                            date: toDojoDateString(estimatedReviewDate, user?.timezoneOverride),
                        })}
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onClose}>
                    {t('settingsCancelButton')}
                </Button>
                <Button loading={request.isLoading()} onClick={onPurchase}>
                    {t('purchaseReviewButton')}
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
    const t = useTranslations('analysisBoard.underboard.settings');
    const tGames = useTranslations('games');
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
            <DialogTitle>{t('gameReviewCompleteDialogTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t.rich('completedReviewDescription', {
                        stream: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        vods: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        youtube: (chunks) => (
                            <Link
                                href='https://www.youtube.com/@ChessDojoLive'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                    })}
                </DialogContentText>

                <Stack
                    sx={{
                        mt: 3,
                    }}
                >
                    <Stack direction='row' spacing={1}>
                        <Typography>{t('reviewerLabel')}</Typography>

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
                        {t('dateReviewedLabel', { date: reviewDateStr, time: reviewTimeStr })}
                    </Typography>
                    {game.reviewRequestedAt && (
                        <Typography>
                            {t('dateRequestedLabel', {
                                date: requestDateStr,
                                time: requestTimeStr,
                            })}
                        </Typography>
                    )}
                    {review.type && (
                        <Typography>
                            {t('reviewTypeDisplayLabel', {
                                type: displayGameReviewType(review.type, tGames),
                            })}
                        </Typography>
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
    const t = useTranslations('analysisBoard.underboard.settings');
    const tGames = useTranslations('games');
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
            <DialogTitle>{t('gameReviewPendingDialogTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t.rich('pendingReviewDescription', {
                        stream: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        vods: (chunks) => (
                            <Link
                                href='https://www.twitch.tv/chessdojo/videos?filter=archives&sort=time'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                        youtube: (chunks) => (
                            <Link
                                href='https://www.youtube.com/@ChessDojoLive'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {chunks}
                            </Link>
                        ),
                    })}
                </DialogContentText>

                <Stack
                    sx={{
                        mt: 3,
                    }}
                >
                    <Typography>
                        {t('dateRequestedLabel', { date: dateStr, time: timeStr })}
                    </Typography>
                    {game.review?.type && (
                        <Typography>
                            {t('reviewTypeDisplayLabel', {
                                type: displayGameReviewType(game.review.type, tGames),
                            })}
                        </Typography>
                    )}
                    <Typography>
                        {t.rich('currentQueuePositionLabel', {
                            value: () =>
                                queueRequest.isLoading() ? (
                                    <CircularProgress size={16} sx={{ ml: 0.5 }} />
                                ) : (
                                    <>{queueRequest.data}</>
                                ),
                        })}
                    </Typography>
                    <Typography>
                        {t('estimatedReviewDateByLabel', { date: reviewDeadline })}
                    </Typography>
                </Stack>
            </DialogContent>
        </>
    );
};
