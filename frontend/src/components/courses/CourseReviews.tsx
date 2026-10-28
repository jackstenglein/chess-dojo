'use client';

import {
    CourseReview,
    CourseReviewsResponse,
    approveCourseReview,
    deleteCourseReview,
    getCourseReviews,
    saveCourseReview,
} from '@/api/courseReviewApi';
import {
    approveDemoCourseReview,
    deleteDemoCourseReview,
    getDemoCourseReviews,
    isCourseReviewDemo,
    saveDemoCourseReview,
} from '@/api/courseReviewDemo';
import { hasDisallowedReviewLinks, reviewLinkMessage } from '@/api/courseReviewLinks';
import { AuthStatus, useAuth } from '@/auth/Auth';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Rating,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';

const loadReviews = isCourseReviewDemo ? getDemoCourseReviews : getCourseReviews;
const saveReview = isCourseReviewDemo ? saveDemoCourseReview : saveCourseReview;
const approveReview = isCourseReviewDemo ? approveDemoCourseReview : approveCourseReview;
const removeReview = isCourseReviewDemo ? deleteDemoCourseReview : deleteCourseReview;

export default function CourseReviews({ type, id }: { type: string; id: string }) {
    const auth = useAuth();
    const token = auth.user?.cognitoUser?.tokens?.idToken?.toString() ?? '';
    const [data, setData] = useState<CourseReviewsResponse>();
    const [rating, setRating] = useState<number | null>(null);
    const [review, setReview] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [editing, setEditing] = useState(false);
    const [demoAdmin, setDemoAdmin] = useState(false);
    const canModerate = isCourseReviewDemo ? demoAdmin : !!data?.canModerate;
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!isCourseReviewDemo && auth.status === AuthStatus.Loading) return;
        let active = true;
        setData(undefined);
        setEditing(false);
        setError('');
        setSaved(false);
        loadReviews(token, type, id)
            .then((result) => {
                if (!active) return;
                setData(result);
                setRating(result.ownReview?.rating ?? null);
                setReview(result.ownReview?.review ?? '');
            })
            .catch(() => {
                if (active) setError('Unable to load course reviews. Please try again.');
            });
        return () => {
            active = false;
        };
    }, [token, type, id, auth.status, retry]);

    async function submit(remove = false) {
        if (!data) return;
        if (!remove && !review.trim()) {
            setError('Please write a review along with your rating.');
            return;
        }
        if (!remove && hasDisallowedReviewLinks(review)) {
            setError(reviewLinkMessage);
            return;
        }
        setBusy(true);
        setError('');
        setSaved(false);
        try {
            let ownReview = null;
            if (remove) {
                await removeReview(token, type, id);
            } else {
                if (!rating) return;
                ownReview = (await saveReview(token, type, id, rating, review)).data;
            }
            const username = ownReview?.username ?? data.ownReview?.username;
            const reviews = data.reviews.filter((item) => item.username !== username);
            if (ownReview) reviews.push(ownReview);
            setData({ ...data, reviews, ownReview });
            setRating(ownReview?.rating ?? null);
            setReview(ownReview?.review ?? '');
            setEditing(false);
            setSaved(true);
        } catch (err) {
            const message: unknown = isAxiosError<{ message?: string }>(err)
                ? err.response?.data?.message
                : isCourseReviewDemo && err instanceof Error
                  ? err.message
                  : undefined;
            setError(
                typeof message === 'string'
                    ? message
                    : 'Unable to save your changes. Please try again.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function moderate(item: CourseReview, action: 'approve' | 'delete') {
        if (!data || !canModerate) return;
        setBusy(true);
        setError('');
        setSaved(false);
        try {
            if (action === 'approve')
                await approveReview(token, type, id, item.username, item.updatedAt);
            else await removeReview(token, type, id, item.username);
            const update = (entry: CourseReview): CourseReview =>
                entry.username === item.username
                    ? { ...entry, moderationStatus: 'APPROVED' }
                    : entry;
            const reviews =
                action === 'delete'
                    ? data.reviews.filter((entry) => entry.username !== item.username)
                    : data.reviews.map(update);
            const ownReview =
                data.ownReview?.username === item.username
                    ? action === 'delete'
                        ? null
                        : update(data.ownReview)
                    : data.ownReview;
            setData({ ...data, reviews, ownReview });
            if (!ownReview && data.ownReview?.username === item.username) {
                setRating(null);
                setReview('');
            }
            setSaved(true);
        } catch {
            setError('Unable to moderate this review. Reload and try again.');
        } finally {
            setBusy(false);
        }
    }

    const average = data?.reviews.length
        ? data.reviews.reduce((sum, item) => sum + item.rating, 0) / data.reviews.length
        : 0;

    return (
        <Stack spacing={2} sx={{ mt: 5 }}>
            <Divider />
            <Typography variant='h5'>Ratings and reviews</Typography>
            {isCourseReviewDemo && (
                <Alert severity='info'>
                    Local demo: you are testing as an eligible reviewer. Reviews stay in this
                    browser and are not published. Real membership and purchase permissions require
                    the backend.
                </Alert>
            )}
            {isCourseReviewDemo && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={demoAdmin}
                            onChange={(_, checked) => setDemoAdmin(checked)}
                        />
                    }
                    label='Preview admin moderation (local demo only)'
                />
            )}
            {error && (
                <Alert severity='error'>
                    {error}
                    {!data && <Button onClick={() => setRetry(retry + 1)}>Retry</Button>}
                </Alert>
            )}
            {!data && !error && <Typography>Loading reviews…</Typography>}
            {data && (
                <>
                    {data.reviews.length > 0 ? (
                        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                            <Rating
                                value={average}
                                precision={0.1}
                                readOnly
                                aria-label={`Average rating: ${average.toFixed(1)} out of 5`}
                            />
                            <Typography>
                                {average.toFixed(1)} out of 5 · {data.reviews.length}{' '}
                                {data.reviews.length === 1 ? 'rating' : 'ratings'}
                            </Typography>
                        </Stack>
                    ) : (
                        <Typography color='text.secondary'>No ratings yet.</Typography>
                    )}
                    {canModerate && (
                        <Alert severity='info'>
                            Moderation queue:{' '}
                            {
                                data.reviews.filter(
                                    (item) => item.review && item.moderationStatus !== 'APPROVED',
                                ).length
                            }{' '}
                            written reviews awaiting approval. Check for profanity and adult content
                            before approving. Deleting removes both the rating and review.
                        </Alert>
                    )}
                    {data.ownReview?.review && data.ownReview.moderationStatus !== 'APPROVED' && (
                        <Alert severity='info'>
                            Your rating is included in the average. Your written review is awaiting
                            admin approval and is visible only to you and administrators.
                        </Alert>
                    )}
                    {data.canReview && (!data.ownReview || editing) ? (
                        <Stack
                            spacing={2}
                            component='form'
                            onSubmit={(event) => {
                                event.preventDefault();
                                void submit();
                            }}
                        >
                            <Typography variant='h6'>
                                {data.ownReview ? 'Your rating and review' : 'Rate this course'}
                            </Typography>
                            <Typography color='text.secondary'>
                                To submit, choose a star rating and write a review.
                            </Typography>
                            <Rating
                                name='course-rating'
                                value={rating}
                                onChange={(_, value) => {
                                    setRating(value);
                                    setSaved(false);
                                }}
                                disabled={busy}
                            />
                            <TextField
                                label='Review'
                                required
                                multiline
                                minRows={3}
                                value={review}
                                onChange={(event) => {
                                    setReview(event.target.value);
                                    setSaved(false);
                                }}
                                disabled={busy}
                                slotProps={{
                                    htmlInput: { maxLength: 5000 },
                                    input: {
                                        endAdornment: (
                                            <InputAdornment
                                                position='end'
                                                sx={{ alignSelf: 'flex-start', mt: 1 }}
                                            >
                                                <Tooltip title='Only links from chessdojo.club, chess.com, and lichess.org are allowed.'>
                                                    <IconButton
                                                        size='small'
                                                        aria-label='Review link rules'
                                                    >
                                                        <InfoOutlinedIcon fontSize='small' />
                                                    </IconButton>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                helperText={`${review.length}/5000`}
                            />
                            <Stack direction='row' spacing={2}>
                                <Button
                                    type='submit'
                                    variant='contained'
                                    disabled={busy || !rating || !review.trim()}
                                >
                                    {data.ownReview ? 'Save changes' : 'Submit rating'}
                                </Button>
                                {data.ownReview && (
                                    <Button
                                        disabled={busy}
                                        onClick={() => {
                                            setRating(data.ownReview?.rating ?? null);
                                            setReview(data.ownReview?.review ?? '');
                                            setEditing(false);
                                            setError('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                {data.ownReview && (
                                    <Button
                                        color='error'
                                        disabled={busy}
                                        onClick={() => void submit(true)}
                                    >
                                        Remove my rating
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    ) : data.ownReview ? (
                        <Stack spacing={1}>
                            <Typography variant='h6'>Your review</Typography>
                            <Rating value={data.ownReview.rating} readOnly size='small' />
                            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                {data.ownReview.review}
                            </Typography>
                            <Stack direction='row' spacing={1}>
                                {data.canReview && (
                                    <Button
                                        disabled={busy}
                                        onClick={() => {
                                            setEditing(true);
                                            setSaved(false);
                                        }}
                                    >
                                        Edit review
                                    </Button>
                                )}
                                <Button
                                    color='error'
                                    disabled={busy}
                                    onClick={() => void submit(true)}
                                >
                                    Remove my rating
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <>
                            <Typography color='text.secondary'>
                                Core members and higher tiers, and anyone who purchased this course,
                                can leave a rating. Sign in with your eligible account to
                                contribute.
                            </Typography>
                            {data.ownReview && (
                                <Button
                                    color='error'
                                    disabled={busy}
                                    onClick={() => void submit(true)}
                                >
                                    Remove my rating
                                </Button>
                            )}
                        </>
                    )}
                    {saved && <Alert severity='success'>Your changes have been saved.</Alert>}
                    {data.reviews
                        .filter(
                            (item) =>
                                canModerate ||
                                (item.review &&
                                    item.moderationStatus === 'APPROVED' &&
                                    item.username !== data.ownReview?.username),
                        )
                        .map((item) => (
                            <Box key={item.username} sx={{ py: 2 }}>
                                {item.review && item.moderationStatus !== 'APPROVED' && (
                                    <Typography variant='caption' color='warning.main'>
                                        Awaiting approval
                                    </Typography>
                                )}
                                <Typography sx={{ fontWeight: 'bold' }}>
                                    {item.displayName || item.username}
                                </Typography>
                                <Rating value={item.rating} readOnly size='small' />
                                <Typography
                                    variant='caption'
                                    color='text.secondary'
                                    sx={{ display: 'block' }}
                                >
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                </Typography>
                                <Typography
                                    sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                                >
                                    {item.review}
                                </Typography>
                                {canModerate && (
                                    <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                                        {item.review && item.moderationStatus !== 'APPROVED' && (
                                            <Button
                                                disabled={busy}
                                                onClick={() => void moderate(item, 'approve')}
                                            >
                                                Approve review
                                            </Button>
                                        )}
                                        <Button
                                            color='error'
                                            disabled={busy}
                                            onClick={() => void moderate(item, 'delete')}
                                        >
                                            Delete review by {item.displayName || item.username}
                                        </Button>
                                    </Stack>
                                )}
                            </Box>
                        ))}
                </>
            )}
        </Stack>
    );
}
