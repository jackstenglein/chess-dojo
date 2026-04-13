import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tournament } from './Tournament';

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: undefined }),
}));

vi.mock('@/config', () => ({
    getConfig: () => ({
        discord: {
            guildId: 'test-guild',
        },
    }),
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

vi.mock('./TournamentInfo', () => ({
    TournamentInfo: () => <div>Tournament Info</div>,
}));

vi.mock('./Players', () => ({
    Players: () => <div>Players Panel</div>,
}));

vi.mock('./Crosstable', () => ({
    Crosstable: () => <div>Crosstable Panel</div>,
}));

vi.mock('./Pairings', () => ({
    Pairings: () => <div>Pairings Panel</div>,
}));

vi.mock('./Games', () => ({
    Games: () => <div>Games Panel</div>,
}));

vi.mock('./Activity', () => ({
    Activity: () => <div>Activity Panel</div>,
}));

vi.mock('./Stats', () => ({
    Stats: () => <div>Stats Panel</div>,
}));

vi.mock('./SubmitGameModal', () => ({
    default: () => null,
}));

vi.mock('./WithdrawModal', () => ({
    WithdrawModal: () => null,
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

describe('Tournament', () => {
    afterEach(cleanup);

    it('switches to the Activity tab and renders the Activity panel', () => {
        render(<Tournament tournament={createTournament()} onUpdateTournaments={vi.fn()} />);

        expect(screen.getByText('Crosstable Panel')).toBeVisible();
        expect(screen.queryByText('Activity Panel')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

        expect(screen.getByText('Activity Panel')).toBeVisible();
        expect(screen.queryByText('Crosstable Panel')).not.toBeInTheDocument();
    });
});
