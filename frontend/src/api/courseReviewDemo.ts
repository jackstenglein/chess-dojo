import { Filter } from 'bad-words';
import type { CourseReview, CourseReviewsResponse } from './courseReviewApi';
import { hasDisallowedReviewLinks, reviewLinkMessage } from './courseReviewLinks';

/** Explicitly opted-in browser demo. Never enabled in a production build. */
export const isCourseReviewDemo =
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_COURSE_REVIEWS_DEMO === 'true';

const profanityFilter = new Filter();

const username = 'local-demo-reviewer';
const storageKey = (type: string, id: string) => `dojo:course-review-demo:${type}:${id}`;

export function getDemoCourseReviews(
    _token: string,
    type: string,
    id: string,
): Promise<CourseReviewsResponse> {
    return Promise.resolve().then(() => {
        const stored = localStorage.getItem(storageKey(type, id));
        const ownReview: CourseReview | null = stored ? (JSON.parse(stored) as CourseReview) : null;
        return { reviews: ownReview ? [ownReview] : [], ownReview, canReview: true };
    });
}

export function saveDemoCourseReview(
    _token: string,
    type: string,
    id: string,
    rating: number,
    review: string,
) {
    return Promise.resolve().then(() => {
        const text = review.trim();
        if (!text) throw new Error('Please write a review along with your rating.');
        if (!Number.isInteger(rating) || rating < 1 || rating > 5 || [...text].length > 5000) {
            throw new Error('Choose 1–5 stars and limit the review to 5000 characters');
        }
        if (hasDisallowedReviewLinks(text)) throw new Error(reviewLinkMessage);
        if (profanityFilter.isProfane(text)) {
            throw new Error(
                'Please remove profanity or explicit sexual language from your review.',
            );
        }
        const data: CourseReview = {
            moderationStatus: 'PENDING',
            username,
            displayName: 'Local demo reviewer',
            rating,
            review: text,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey(type, id), JSON.stringify(data));
        return { data };
    });
}

export function deleteDemoCourseReview(
    _token: string,
    type: string,
    id: string,
    _username?: string,
) {
    return Promise.resolve().then(() => localStorage.removeItem(storageKey(type, id)));
}

// Demo-only: server authorization is tested separately in the Go handler tests.
export function approveDemoCourseReview(
    _token: string,
    type: string,
    id: string,
    author: string,
    updatedAt: string,
) {
    return getDemoCourseReviews('', type, id).then(({ ownReview }) => {
        if (ownReview?.username !== author || ownReview.updatedAt !== updatedAt) {
            throw new Error('This review changed. Reload before approving it.');
        }
        if (hasDisallowedReviewLinks(ownReview.review)) throw new Error(reviewLinkMessage);
        localStorage.setItem(
            storageKey(type, id),
            JSON.stringify({ ...ownReview, moderationStatus: 'APPROVED' }),
        );
    });
}
