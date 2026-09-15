import { renderWithIntl } from '@/i18n/intl.test';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Players } from './Players';

const authState = vi.hoisted(() => ({
    user: undefined as
        { username: string; isAdmin?: boolean; isTournamentAdmin?: boolean } | undefined,
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: authState.user }),
}));

vi.mock('@/components/navigation/Link', async () => {
    const { forwardRef } = await import('react');
    return {
        Link: forwardRef<HTMLAnchorElement, { children: ReactNode; href: string }>(
            ({ children, href, ...rest }, ref) => (
                <a ref={ref} href={href} {...rest}>
                    {children}
                </a>
            ),
        ),
    };
});

vi.mock('./AdminEditPlayerDialog', () => ({
    AdminEditPlayerDialog: ({
        open,
        player,
    }: {
        open: boolean;
        player: { displayName: string };
    }) => (open ? <div>Admin Edit Player Dialog: {player.displayName}</div> : null),
}));

function createTournament(overrides: Partial<RoundRobin> = {}): RoundRobin {
    return {
        type: 'ROUND_ROBIN_TEST',
        startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
        cohort: '0-1000',
        name: 'Test Tournament',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-07-01T00:00:00.000Z',
        players: {
            alice: {
                username: 'alice',
                displayName: 'Alice',
                lichessUsername: 'alice_l',
                chesscomUsername: 'alice_c',
                discordUsername: 'alice_d',
                discordId: '1',
                status: RoundRobinPlayerStatuses.ACTIVE,
            },
            bob: {
                username: 'bob',
                displayName: 'Bob',
                lichessUsername: 'bob_l',
                chesscomUsername: 'bob_c',
                discordUsername: 'bob_d',
                discordId: '2',
                status: RoundRobinPlayerStatuses.ACTIVE,
            },
        },
        playerOrder: ['alice', 'bob'],
        pairings: [[]],
        updatedAt: '2024-06-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('Players admin controls', () => {
    afterEach(cleanup);

    beforeEach(() => {
        authState.user = undefined;
    });

    it('hides edit actions for non-admins', () => {
        authState.user = { username: 'viewer', isAdmin: false };
        renderWithIntl(<Players tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.queryByRole('button', { name: 'Edit player' })).not.toBeInTheDocument();
        expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('shows edit actions for admins and opens the edit-player dialog', () => {
        authState.user = { username: 'admin', isAdmin: true };
        renderWithIntl(<Players tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.getByText('Actions')).toBeVisible();
        const editButtons = screen.getAllByRole('button', { name: 'Edit player' });
        expect(editButtons).toHaveLength(2);

        fireEvent.click(editButtons[0]);
        expect(screen.getByText(/Admin Edit Player Dialog:/)).toBeVisible();
    });

    it('shows edit actions for tournament admins', () => {
        authState.user = { username: 'tadmin', isTournamentAdmin: true };
        renderWithIntl(<Players tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.getAllByRole('button', { name: 'Edit player' })).toHaveLength(2);
    });
});
