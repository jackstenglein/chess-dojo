import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClubDetailsPage } from './ClubDetailsPage';

const mocks = vi.hoisted(() => ({
    api: {
        getClub: vi.fn(),
        updateUser: vi.fn(),
    },
    auth: {
        user: { username: 'viewer', mainClubId: '' },
    },
}));

vi.mock('@/api/Api', () => ({
    useApi: () => mocks.api,
}));

vi.mock('@/auth/Auth', async () => {
    const { useState } = await import('react');

    return {
        AuthStatus: { Loading: 'Loading' },
        useAuth: () => {
            const [user, setUser] = useState(mocks.auth.user);
            return {
                user,
                status: 'Authenticated',
                updateUser: (update: Partial<typeof mocks.auth.user>) =>
                    setUser((current) => ({ ...current, ...update })),
            };
        },
        useFreeTier: () => false,
    };
});

vi.mock('@/components/clubs/LocationChip', () => ({
    LocationChip: () => null,
}));
vi.mock('@/components/clubs/MemberCountChip', () => ({
    MemberCountChip: () => null,
}));
vi.mock('@/components/clubs/UrlChip', () => ({
    UrlChip: () => null,
}));
vi.mock('@/components/newsfeed/NewsfeedList', () => ({
    default: () => null,
}));
vi.mock('@/profile/Avatar', () => ({
    ClubAvatar: () => null,
}));
vi.mock('@/upsell/UpsellDialog', () => ({
    default: () => null,
    RestrictedAction: { JoinSubscriberClubs: 'JoinSubscriberClubs' },
}));
vi.mock('react-markdown', () => ({
    default: () => null,
}));
vi.mock('remark-gfm', () => ({
    default: () => null,
}));
vi.mock('./ClubJoinRequestDialog', () => ({
    ClubJoinRequestDialog: () => null,
}));
vi.mock('./JoinRequestsTab', () => ({
    JoinRequestsTab: () => null,
}));
vi.mock('./LeaveClubDialog', () => ({
    LeaveClubDialog: () => null,
}));
vi.mock('./ScoreboardTab', () => ({
    ScoreboardTab: () => null,
}));
vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: () => ({
        searchParams: new URLSearchParams({ view: 'scoreboard' }),
        setSearchParams: vi.fn(),
    }),
}));
vi.mock('@/hooks/useRouter', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/loading/LoadingPage', () => ({
    default: () => null,
}));
vi.mock('@mui/icons-material', () => ({
    Star: () => <span data-testid='main-club-icon' />,
}));

const club = {
    id: 'club-a',
    name: 'Club A',
    shortDescription: 'Short description',
    description: 'Description',
    owner: 'owner',
    externalUrl: '',
    location: { city: '', state: '', country: '' },
    memberCount: 1,
    unlisted: false,
    approvalRequired: false,
    allowFreeTier: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    members: { viewer: { username: 'viewer', joinedAt: '2024-01-01T00:00:00Z' } },
    joinRequests: {},
};

afterEach(cleanup);
beforeEach(() => {
    mocks.api.getClub.mockResolvedValue({ data: { club, scoreboard: [] } });
    mocks.api.updateUser.mockResolvedValue({ data: {} });
    mocks.auth.user = { username: 'viewer', mainClubId: '' };
});

describe('ClubDetailsPage main club action', () => {
    it('sets the current club as main', async () => {
        renderWithIntl(<ClubDetailsPage id='club-a' />);

        const setMainClubButton = await screen.findByRole('button', { name: 'Set as Main Club' });
        fireEvent.click(setMainClubButton);

        await waitFor(() => {
            expect(mocks.api.updateUser).toHaveBeenCalledWith({ mainClubId: 'club-a' });
        });
    });

    it('shows the new designation after the update succeeds', async () => {
        renderWithIntl(<ClubDetailsPage id='club-a' />);

        fireEvent.click(await screen.findByRole('button', { name: 'Set as Main Club' }));

        expect(await screen.findByText('Main Club')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Set as Main Club' })).not.toBeInTheDocument();
    });

    it('shows the main club chip instead of the action', async () => {
        mocks.auth.user = { username: 'viewer', mainClubId: 'club-a' };

        renderWithIntl(<ClubDetailsPage id='club-a' />);

        expect(await screen.findByText('Main Club')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Set as Main Club' })).not.toBeInTheDocument();
    });
});
