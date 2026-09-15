import { RequestStatus } from '@/api/Request';
import { ClubSortMethod } from '@/hooks/useClubFilters';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyClubsTab } from './MyClubsTab';

const mocks = vi.hoisted(() => ({
    api: {
        updateUser: vi.fn(),
    },
    auth: {
        user: {
            username: 'viewer',
            clubs: ['club-a', 'club-b'],
            mainClubId: 'club-a',
        },
    },
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/api/cache/clubs', () => ({
    useClubs: () => ({
        clubs: [
            {
                id: 'club-a',
                name: 'Club A',
                shortDescription: 'First club',
                description: '',
                owner: 'owner-a',
                externalUrl: '',
                location: { city: '', state: '', country: '' },
                memberCount: 2,
                unlisted: false,
                approvalRequired: false,
                allowFreeTier: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            },
            {
                id: 'club-b',
                name: 'Club B',
                shortDescription: 'Second club',
                description: '',
                owner: 'owner-b',
                externalUrl: '',
                location: { city: '', state: '', country: '' },
                memberCount: 3,
                unlisted: false,
                approvalRequired: false,
                allowFreeTier: true,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
            },
        ],
        request: {
            status: RequestStatus.Success,
            onStart: vi.fn(),
            onSuccess: vi.fn(),
            onFailure: vi.fn(),
            reset: vi.fn(),
            isLoading: () => false,
            isSent: () => true,
            isFailure: () => false,
        },
    }),
}));

vi.mock('@/auth/Auth', () => {
    return {
        useAuth: () => {
            const [user, setUser] = useState(mocks.auth.user);
            return {
                user,
                updateUser: (update: Partial<typeof mocks.auth.user>) =>
                    setUser((current) => ({ ...current, ...update })),
            };
        },
    };
});

vi.mock('@/profile/Avatar', () => ({
    ClubAvatar: () => null,
}));

vi.mock('@mui/icons-material', () => ({
    Groups: () => <span />,
    Place: () => <span />,
    Star: () => <span />,
}));

const filters = {
    search: '',
    setSearch: vi.fn(),
    sortMethod: ClubSortMethod.Alphabetical,
    setSortMethod: vi.fn(),
    sortDirection: 'asc' as const,
    setSortDirection: vi.fn(),
};

function getClubCard(name: string) {
    const link = screen.getByRole('link', { name: new RegExp(name) });
    if (!link.parentElement) {
        throw new Error(`Card not found for ${name}`);
    }
    return link.parentElement;
}

afterEach(cleanup);
beforeEach(() => {
    mocks.api.updateUser.mockReset();
    mocks.api.updateUser.mockResolvedValue({ data: {} });
    mocks.auth.user = {
        username: 'viewer',
        clubs: ['club-a', 'club-b'],
        mainClubId: 'club-a',
    };
});

describe('MyClubsTab main club action', () => {
    it('offers the action on non-main clubs only', () => {
        renderWithIntl(<MyClubsTab filters={filters} />);

        expect(within(getClubCard('Club A')).getByText('Main Club')).toBeVisible();
        expect(
            within(getClubCard('Club A')).queryByRole('button', { name: 'Set as Main Club' }),
        ).not.toBeInTheDocument();
        expect(
            within(getClubCard('Club B')).getByRole('button', { name: 'Set as Main Club' }),
        ).toBeVisible();
    });

    it('switches the main club from the overview', async () => {
        renderWithIntl(<MyClubsTab filters={filters} />);

        fireEvent.click(
            within(getClubCard('Club B')).getByRole('button', { name: 'Set as Main Club' }),
        );

        await waitFor(() => {
            expect(mocks.api.updateUser).toHaveBeenCalledWith({ mainClubId: 'club-b' });
        });
        expect(within(getClubCard('Club B')).getByText('Main Club')).toBeVisible();
        expect(
            within(getClubCard('Club A')).getByRole('button', { name: 'Set as Main Club' }),
        ).toBeVisible();
    });
});
