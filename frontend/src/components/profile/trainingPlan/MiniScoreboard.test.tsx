import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniScoreboard } from './MiniScoreboard';

const { getScoreboard, viewer } = vi.hoisted(() => ({
    getScoreboard: vi.fn(),
    viewer: {
        username: 'self',
        displayName: 'My profile',
        dojoCohort: '1200-1300',
        totalDojoScore: 1,
        progress: {},
        minutesSpent: {},
    },
}));
vi.mock('@/api/Api', () => ({ useApi: () => ({ getScoreboard }) }));
vi.mock('@/auth/Auth', () => ({ useAuth: () => ({ user: viewer }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/profile/Avatar', () => ({ default: () => null }));
vi.mock('@/scoreboard/CohortIcon', () => ({ default: () => null }));
vi.mock('@/components/navigation/Link', () => ({ Link: 'a' }));

describe('mini scoreboard privacy', () => {
    beforeEach(() => getScoreboard.mockReset());

    it('excludes restricted profiles before selecting the top five and includes the owner', async () => {
        getScoreboard.mockResolvedValue([
            {
                username: 'hidden',
                displayName: 'Hidden player',
                canViewTraining: false,
                progress: {},
                totalDojoScore: 99999,
            },
            ...Array.from({ length: 6 }, (_, i) => ({
                username: `p${i}`,
                displayName: `Player ${i}`,
                progress: {},
                totalDojoScore: 100 - i,
            })),
        ]);
        render(<MiniScoreboard cohort='1200-1300' />);
        await waitFor(() => expect(screen.getByText('Player 4')).toBeInTheDocument());
        expect(screen.queryByText('Hidden player')).not.toBeInTheDocument();
        expect(screen.queryByText('Player 5')).not.toBeInTheDocument();
        expect(screen.getByText('My profile')).toBeInTheDocument();
        expect(screen.getByText('#7')).toBeInTheDocument();
    });
});
