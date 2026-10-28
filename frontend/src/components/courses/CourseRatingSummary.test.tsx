import { getCourseReviews } from '@/api/courseReviewApi';
import { getDemoCourseReviews } from '@/api/courseReviewDemo';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CourseRatingSummary from './CourseRatingSummary';

const mode = vi.hoisted(() => ({ demo: false }));
vi.mock('@/api/courseReviewApi', () => ({ getCourseReviews: vi.fn() }));
vi.mock('@/api/courseReviewDemo', () => ({
    getDemoCourseReviews: vi.fn(),
    get isCourseReviewDemo() {
        return mode.demo;
    },
}));
afterEach(cleanup);
beforeEach(() => {
    vi.resetAllMocks();
    mode.demo = false;
});
const review = { username: 'alice', displayName: 'Alice', rating: 4, review: '', updatedAt: '' };
it('shows the average out of five and counts ratings without text', async () => {
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [review, { ...review, username: 'bob', rating: 5, review: 'Helpful' }],
        ownReview: null,
        canReview: false,
    });
    render(<CourseRatingSummary type='WORKSHOP' id='course' />);
    expect(await screen.findByText('4.5 / 5 · 2 ratings')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4.5 out of 5 stars' })).toBeInTheDocument();
    expect(getCourseReviews).toHaveBeenCalledWith('', 'WORKSHOP', 'course');
});
it('renders nothing for an unrated course', async () => {
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [],
        ownReview: null,
        canReview: false,
    });
    const { container } = render(<CourseRatingSummary type='OPENING' id='course' />);
    await waitFor(() => expect(getCourseReviews).toHaveResolved());
    expect(container).toBeEmptyDOMElement();
});
it('keeps the rating area hidden if ratings cannot be loaded', async () => {
    vi.mocked(getCourseReviews).mockRejectedValue(new Error('offline'));
    const { container } = render(<CourseRatingSummary type='OPENING' id='course' />);
    await waitFor(() => expect(getCourseReviews).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
});
it('reads local demo ratings when demo mode is enabled', async () => {
    mode.demo = true;
    vi.mocked(getDemoCourseReviews).mockResolvedValue({
        reviews: [review],
        ownReview: review,
        canReview: true,
    });
    render(<CourseRatingSummary type='WORKSHOP' id='course' />);
    expect(await screen.findByText('4.0 / 5 · 1 rating')).toBeInTheDocument();
    expect(getCourseReviews).not.toHaveBeenCalled();
});
