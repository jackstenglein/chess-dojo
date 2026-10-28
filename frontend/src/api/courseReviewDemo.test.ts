import { beforeEach, expect, it, vi } from 'vitest';
import {
    approveDemoCourseReview,
    deleteDemoCourseReview,
    getDemoCourseReviews,
    saveDemoCourseReview,
} from './courseReviewDemo';
vi.mock('./courseReviewApi', () => ({}));
beforeEach(() => localStorage.clear());
it('persists a demo rating, replaces it on edit and removes it', async () => {
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).reviews).toEqual([]);
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'Helpful course');
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.rating).toBe(4);
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 5, ' Great course ');
    const result = await getDemoCourseReviews('', 'WORKSHOP', 'a');
    expect(result.reviews).toHaveLength(1);
    expect(result.ownReview?.review).toBe('Great course');
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'b')).reviews).toEqual([]);
    await deleteDemoCourseReview('', 'WORKSHOP', 'a');
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview).toBeNull();
});
it('rejects invalid ratings and oversized reviews', async () => {
    for (const rating of [0, 6, 2.5]) {
        await expect(saveDemoCourseReview('', 'WORKSHOP', 'a', rating, '')).rejects.toThrow();
    }
    await expect(saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'a'.repeat(5001))).rejects.toThrow();
});

it('queues text for approval and resets approval on edit', async () => {
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'Helpful course');
    const { ownReview } = await getDemoCourseReviews('', 'WORKSHOP', 'a');
    expect(ownReview?.moderationStatus).toBe('PENDING');
    if (!ownReview) throw new Error('Missing review');
    await approveDemoCourseReview('', 'WORKSHOP', 'a', ownReview.username, ownReview.updatedAt);
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.moderationStatus).toBe(
        'APPROVED',
    );
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'Edited review');
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.moderationStatus).toBe(
        'PENDING',
    );
    await expect(
        saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'This is fucking awful'),
    ).rejects.toThrow('Please remove');
});

it('rejects non-whitelisted links without replacing an existing review', async () => {
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'Useful course');
    await expect(saveDemoCourseReview('', 'WORKSHOP', 'a', 5, 'See example.com')).rejects.toThrow(
        'Links are allowed only',
    );
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.review).toBe(
        'Useful course',
    );
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 5, 'See https://lichess.org/study/abc');
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.rating).toBe(5);
});

it('requires non-whitespace review text and preserves the existing submission', async () => {
    await saveDemoCourseReview('', 'WORKSHOP', 'a', 4, 'Helpful course');
    for (const text of ['', '   ', '\n\t']) {
        await expect(saveDemoCourseReview('', 'WORKSHOP', 'a', 5, text)).rejects.toThrow(
            'Please write a review',
        );
    }
    expect((await getDemoCourseReviews('', 'WORKSHOP', 'a')).ownReview?.rating).toBe(4);
});
