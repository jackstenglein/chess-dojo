import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Activity, getActivitySummary } from './Activity';

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
            carol: {
                username: 'carol',
                displayName: 'Carol',
                lichessUsername: 'carol_l',
                chesscomUsername: 'carol_c',
                discordUsername: 'carol_d',
                discordId: '3',
                status: RoundRobinPlayerStatuses.ACTIVE,
            },
        },
        playerOrder: ['alice', 'bob', 'carol'],
        pairings: [],
        updatedAt: '2024-06-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('Activity', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-20T12:00:00Z'));
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('renders the empty state when no games have been submitted', () => {
        const tournament = createTournament({
            pairings: [[{ white: 'alice', black: 'bob' }]],
        });

        render(<Activity tournament={tournament} />);

        expect(screen.getByText('No games submitted yet')).toBeInTheDocument();
    });

    it('summarizes activities in reverse submission order and places undated games last', () => {
        const tournament = createTournament({
            pairings: [
                [
                    {
                        white: 'alice',
                        black: 'bob',
                        result: '1-0',
                        url: 'https://example.com/game-1',
                        submittedAt: '2024-06-18T10:00:00Z',
                    },
                    {
                        white: 'carol',
                        black: 'alice',
                        result: '0-1',
                        url: 'https://example.com/game-2',
                    },
                ],
                [
                    {
                        white: 'bob',
                        black: 'carol',
                        result: '1/2-1/2',
                        url: 'https://example.com/game-3',
                        submittedAt: '2024-06-19T09:00:00Z',
                    },
                ],
            ],
        });

        const summary = getActivitySummary(tournament, new Date('2024-06-20T12:00:00Z'));

        expect(summary.activities.map((activity) => activity.url)).toEqual([
            'https://example.com/game-3',
            'https://example.com/game-1',
            'https://example.com/game-2',
        ]);
        expect(summary.completedGames).toBe(3);
        expect(summary.totalPairings).toBe(3);
        expect(summary.completionRate).toBe(100);
        expect(summary.daysSinceLastGame).toBe(1);
        expect(summary.mostRecentDate?.toISOString()).toBe('2024-06-19T09:00:00.000Z');
    });

    it('renders withdrawn players and a stall warning for incomplete stale tournaments', () => {
        const tournament = createTournament({
            players: {
                ...createTournament().players,
                bob: {
                    ...createTournament().players.bob,
                    status: RoundRobinPlayerStatuses.WITHDRAWN,
                },
            },
            pairings: [
                [
                    {
                        white: 'alice',
                        black: 'bob',
                        result: '1-0',
                        url: 'https://example.com/game-1',
                        submittedAt: '2024-06-05T09:00:00Z',
                    },
                    {
                        white: 'alice',
                        black: 'carol',
                    },
                ],
            ],
        });

        render(<Activity tournament={tournament} />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getAllByText('(Withdrawn)')).toHaveLength(1);
        expect(screen.getByText(/15 days ago/)).toBeInTheDocument();
        expect(
            screen.getByText(/Tournament may have stalled - No games submitted in 15 days/),
        ).toBeInTheDocument();
    });

    it('does not render a stall warning when all pairings are completed', () => {
        const tournament = createTournament({
            pairings: [
                [
                    {
                        white: 'alice',
                        black: 'bob',
                        result: '1-0',
                        url: 'https://example.com/game-1',
                        submittedAt: '2024-06-01T09:00:00Z',
                    },
                ],
            ],
        });

        render(<Activity tournament={tournament} />);

        expect(
            screen.queryByText(/Tournament may have stalled - No games submitted in/),
        ).not.toBeInTheDocument();
    });
});
