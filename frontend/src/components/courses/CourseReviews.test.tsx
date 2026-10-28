import {
    approveCourseReview,
    deleteCourseReview,
    getCourseReviews,
    saveCourseReview,
} from '@/api/courseReviewApi';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CourseReviews from './CourseReviews';

vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'Loading' },
    useAuth: () => ({
        status: 'Authenticated',
        user: { cognitoUser: { tokens: { idToken: 'token' } } },
    }),
}));
vi.mock('@/api/courseReviewApi', () => ({
    getCourseReviews: vi.fn(),
    saveCourseReview: vi.fn(),
    deleteCourseReview: vi.fn(),
    approveCourseReview: vi.fn(),
}));
const own = {
    username: 'alice',
    displayName: 'Alice',
    rating: 4,
    review: '',
    updatedAt: '2026-10-27T00:00:00Z',
};

afterEach(cleanup);
beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [],
        ownReview: null,
        canReview: true,
    });
    vi.mocked(saveCourseReview).mockResolvedValue({ data: own } as Awaited<
        ReturnType<typeof saveCourseReview>
    >);
});

describe('CourseReviews', () => {
    it('requires stars and non-whitespace text before enabling submission', async () => {
        render(<CourseReviews type='OPENING' id='course' />);
        const submit = await screen.findByRole('button', { name: 'Submit rating' });
        expect(submit).toBeDisabled();
        fireEvent.click(screen.getByLabelText('4 Stars'));
        expect(submit).toBeDisabled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
            target: { value: '   ' },
        });
        expect(submit).toBeDisabled();
        expect(saveCourseReview).not.toHaveBeenCalled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
            target: { value: 'Helpful explanations' },
        });
        expect(submit).toBeEnabled();
    });
    it('sends required text with the rating', async () => {
        render(<CourseReviews type='OPENING' id='course' />);
        await screen.findByRole('button', { name: 'Submit rating' });
        fireEvent.click(screen.getByLabelText('4 Stars'));
        fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
            target: { value: 'Helpful explanations' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
        await waitFor(() =>
            expect(saveCourseReview).toHaveBeenCalledWith(
                'token',
                'OPENING',
                'course',
                4,
                'Helpful explanations',
            ),
        );
    });
    it('allows removing a previous rating after membership expires', async () => {
        vi.mocked(getCourseReviews).mockResolvedValue({
            reviews: [own],
            ownReview: own,
            canReview: false,
        });
        render(<CourseReviews type='OPENING' id='course' />);
        fireEvent.click(await screen.findByRole('button', { name: 'Remove my rating' }));
        await waitFor(() =>
            expect(deleteCourseReview).toHaveBeenCalledWith('token', 'OPENING', 'course'),
        );
        expect(await screen.findByText('No ratings yet.')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Review' })).not.toBeInTheDocument();
    });
    it('shows a failed save without discarding the form', async () => {
        vi.mocked(saveCourseReview).mockRejectedValue(new Error('offline'));
        render(<CourseReviews type='OPENING' id='course' />);
        await screen.findByRole('button', { name: 'Submit rating' });
        fireEvent.click(screen.getByLabelText('4 Stars'));
        fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
            target: { value: 'Helpful explanations' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
        expect(
            await screen.findByText('Unable to save your changes. Please try again.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit rating' })).toBeEnabled();
    });
});

it('lets admins approve and delete another author review', async () => {
    const pending = {
        ...own,
        username: 'bob',
        displayName: 'Bob',
        review: 'Helpful course',
        moderationStatus: 'PENDING' as const,
    };
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [pending],
        ownReview: null,
        canReview: false,
        canModerate: true,
    });
    render(<CourseReviews type='OPENING' id='course' />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve review' }));
    await waitFor(() =>
        expect(approveCourseReview).toHaveBeenCalledWith(
            'token',
            'OPENING',
            'course',
            'bob',
            pending.updatedAt,
        ),
    );
    await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Approve review' })).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete review by Bob' }));
    await waitFor(() =>
        expect(deleteCourseReview).toHaveBeenCalledWith('token', 'OPENING', 'course', 'bob'),
    );
    expect(await screen.findByText('No ratings yet.')).toBeInTheDocument();
});
it('hides pending text and moderation from regular members', async () => {
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [
            { ...own, username: 'bob', review: 'Hidden pending text', moderationStatus: 'PENDING' },
        ],
        ownReview: null,
        canReview: false,
    });
    render(<CourseReviews type='OPENING' id='course' />);
    await screen.findByText('4.0 out of 5 · 1 rating');
    expect(screen.queryByText('Hidden pending text')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete review by/ })).not.toBeInTheDocument();
});

it('explains the whitelist and prevents submitting an external link', async () => {
    render(<CourseReviews type='OPENING' id='course' />);
    await screen.findByRole('button', { name: 'Submit rating' });
    fireEvent.click(screen.getByLabelText('4 Stars'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
        target: { value: 'See example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }));
    expect(
        await screen.findByText(
            'Links are allowed only to chessdojo.club, chess.com, and lichess.org.',
        ),
    ).toBeInTheDocument();
    expect(saveCourseReview).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('See example.com');
});

it('shows a saved review until the author chooses to edit, and supports cancel', async () => {
    vi.mocked(getCourseReviews).mockResolvedValue({
        reviews: [{ ...own, review: 'Helpful explanations', moderationStatus: 'APPROVED' }],
        ownReview: { ...own, review: 'Helpful explanations', moderationStatus: 'APPROVED' },
        canReview: true,
    });
    render(<CourseReviews type='OPENING' id='course' />);
    expect(await screen.findByText('Your review')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Review' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Helpful explanations')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit review' }));
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('Helpful explanations');
    fireEvent.change(screen.getByRole('textbox', { name: 'Review' }), {
        target: { value: 'Unsaved edit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'Review' })).not.toBeInTheDocument();
    expect(screen.getByText('Helpful explanations')).toBeInTheDocument();
    expect(saveCourseReview).not.toHaveBeenCalled();
});
