import { beforeEach, expect, it, vi } from 'vitest';
import { getCourseReviews } from './courseReviewApi';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./axiosService', () => ({ axiosService: { get } }));
beforeEach(() => vi.clearAllMocks());
it('combines every page so the rating average includes all submissions', async () => {
    const review = { username: 'a', displayName: 'A', rating: 4, review: '', updatedAt: '' };
    get.mockResolvedValueOnce({
        data: {
            reviews: [review],
            ownReview: review,
            canReview: true,
            lastEvaluatedKey: 'next',
        },
    }).mockResolvedValueOnce({
        data: {
            reviews: [{ ...review, username: 'b', rating: 2 }],
            ownReview: review,
            canReview: true,
        },
    });
    const result = await getCourseReviews('token', 'OPENING', 'course');
    expect(result.reviews).toHaveLength(2);
    expect(result.ownReview).toEqual(review);
    expect(get).toHaveBeenLastCalledWith(
        '/courses/OPENING/course/reviews',
        expect.objectContaining({
            params: { startKey: 'next' },
            headers: { Authorization: 'Bearer token' },
        }),
    );
});
it('uses the public route for signed-out viewers', async () => {
    get.mockResolvedValue({
        data: { reviews: [], ownReview: null, canReview: false },
    });
    await getCourseReviews('', 'OPENING', 'course');
    expect(get).toHaveBeenCalledWith(
        '/public/courses/OPENING/course/reviews',
        expect.objectContaining({ headers: undefined }),
    );
});
