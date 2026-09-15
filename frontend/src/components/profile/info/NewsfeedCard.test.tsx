import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const messages = require('../../../../messages/en.json') as Record<string, unknown>;

function renderWithIntl(ui: React.ReactElement) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextIntlClientProvider } = require('next-intl') as {
        NextIntlClientProvider: React.FC<{
            locale: string;
            messages: Record<string, unknown>;
            children: React.ReactNode;
        }>;
    };
    return render(
        <NextIntlClientProvider locale='en' messages={messages}>
            {ui}
        </NextIntlClientProvider>,
    );
}

describe('NewsfeedCard', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the Newsfeed heading', () => {
        renderWithIntl(<NewsfeedCard />);
        expect(screen.getByText('Newsfeed')).toBeInTheDocument();
    });

    it('renders the View All link to /newsfeed', () => {
        renderWithIntl(<NewsfeedCard />);
        const link = screen.getByText('View All').closest('a');
        expect(link).toHaveAttribute('href', '/newsfeed');
    });

    it('has the data-testid attribute on the card', () => {
        const { container } = renderWithIntl(<NewsfeedCard />);
        expect(container.querySelector('[data-testid="newsfeed-card"]')).toBeInTheDocument();
    });

    it('shows empty state when no entries', () => {
        renderWithIntl(<NewsfeedCard />);
        expect(
            screen.getByText('No recent activity from your follows or cohort.'),
        ).toBeInTheDocument();
    });
});
