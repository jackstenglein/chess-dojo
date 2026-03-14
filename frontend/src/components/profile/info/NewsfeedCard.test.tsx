import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { dojoCohort: '1300-1400' } }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({
        listNewsfeed: vi.fn().mockResolvedValue({ data: { entries: [], lastKeys: {} } }),
    }),
}));

vi.mock('@/api/Request', () => ({
    useRequest: () => ({
        isSent: () => true,
        isLoading: () => false,
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        reset: vi.fn(),
    }),
}));

vi.mock('@/components/newsfeed/NewsfeedItem', () => ({
    default: ({ entry }: { entry: { id: string } }) => (
        <div data-testid={`newsfeed-item-${entry.id}`}>Mock Entry</div>
    ),
}));

import { NewsfeedCard } from './NewsfeedCard';

describe('NewsfeedCard', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the Newsfeed heading', () => {
        render(<NewsfeedCard />);
        expect(screen.getByText('Newsfeed')).toBeInTheDocument();
    });

    it('renders the View All link to /newsfeed', () => {
        render(<NewsfeedCard />);
        const link = screen.getByText('View All').closest('a');
        expect(link).toHaveAttribute('href', '/newsfeed');
    });

    it('has the data-testid attribute on the card', () => {
        const { container } = render(<NewsfeedCard />);
        expect(container.querySelector('[data-testid="newsfeed-card"]')).toBeInTheDocument();
    });

    it('shows empty state when no entries', () => {
        render(<NewsfeedCard />);
        expect(
            screen.getByText('No recent activity from your follows or cohort.'),
        ).toBeInTheDocument();
    });
});
