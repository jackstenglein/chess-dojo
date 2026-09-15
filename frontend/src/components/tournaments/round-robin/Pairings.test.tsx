import { renderWithIntl } from '@/i18n/intl.test';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pairings } from './Pairings';

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

vi.mock('./AdminSetResultDialog', () => ({
    AdminSetResultDialog: ({
        open,
        whiteDisplayName,
        blackDisplayName,
    }: {
        open: boolean;
        whiteDisplayName: string;
        blackDisplayName: string;
    }) =>
        open ? (
            <div>
                Admin Set Result Dialog: {whiteDisplayName} vs {blackDisplayName}
            </div>
        ) : null,
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
        pairings: [[{ white: 'alice', black: 'bob', result: '1-0' }]],
        updatedAt: '2024-06-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('Pairings admin controls', () => {
    afterEach(cleanup);

    beforeEach(() => {
        authState.user = undefined;
    });

    it('hides edit actions for non-admins', () => {
        authState.user = { username: 'viewer', isAdmin: false };
        renderWithIntl(<Pairings tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.queryByRole('button', { name: 'Update result' })).not.toBeInTheDocument();
        expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('shows edit actions for admins and opens the set-result dialog', () => {
        authState.user = { username: 'admin', isAdmin: true };
        renderWithIntl(<Pairings tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.getByText('Actions')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Update result' }));
        expect(screen.getByText('Admin Set Result Dialog: Alice vs Bob')).toBeVisible();
    });

    it('shows edit actions for tournament admins', () => {
        authState.user = { username: 'tadmin', isTournamentAdmin: true };
        renderWithIntl(<Pairings tournament={createTournament()} onUpdate={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Update result' })).toBeVisible();
    });
});
