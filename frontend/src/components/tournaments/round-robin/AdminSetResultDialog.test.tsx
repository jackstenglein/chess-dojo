import { renderWithIntl } from '@/i18n/intl.test';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSetResultDialog } from './AdminSetResultDialog';

const adminSetRoundRobinResultMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/roundRobinApi', () => ({
    adminSetRoundRobinResult: adminSetRoundRobinResultMock,
}));

function createTournament(): RoundRobin {
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
        pairings: [[{ white: 'alice', black: 'bob' }]],
        updatedAt: '2024-06-01T00:00:00.000Z',
    };
}

describe('AdminSetResultDialog', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();

    afterEach(cleanup);

    beforeEach(() => {
        adminSetRoundRobinResultMock.mockReset();
        onClose.mockReset();
        onUpdate.mockReset();
    });

    function renderDialog(overrides: Partial<Parameters<typeof AdminSetResultDialog>[0]> = {}) {
        return renderWithIntl(
            <AdminSetResultDialog
                open
                onClose={onClose}
                cohort='0-1000'
                startsAt='ACTIVE_2024-06-01T00:00:00.000Z'
                round={1}
                white='alice'
                black='bob'
                whiteDisplayName='Alice'
                blackDisplayName='Bob'
                onUpdate={onUpdate}
                {...overrides}
            />,
        );
    }

    it('shows validation error when submitting empty clear with no existing result', () => {
        renderDialog();

        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        expect(screen.getByText('Provide a result or a game URL')).toBeVisible();
        expect(adminSetRoundRobinResultMock).not.toHaveBeenCalled();
    });

    it('submits a manual result', async () => {
        const tournament = createTournament();
        adminSetRoundRobinResultMock.mockResolvedValue({ data: tournament });
        renderDialog({ initialResult: '1-0' });

        fireEvent.mouseDown(screen.getByLabelText('Result'));
        fireEvent.click(screen.getByRole('option', { name: 'Black Wins (0-1)' }));
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(adminSetRoundRobinResultMock).toHaveBeenCalledWith({
                cohort: '0-1000',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '0-1',
                url: undefined,
            });
        });
        expect(onUpdate).toHaveBeenCalledWith(tournament);
        expect(onClose).toHaveBeenCalled();
    });

    it('submits a clear request when result is cleared', async () => {
        const tournament = createTournament();
        adminSetRoundRobinResultMock.mockResolvedValue({ data: tournament });
        renderDialog({ initialResult: '1-0', initialUrl: 'https://lichess.org/abc' });

        fireEvent.mouseDown(screen.getByLabelText('Result'));
        fireEvent.click(screen.getByRole('option', { name: 'Clear Result' }));
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(adminSetRoundRobinResultMock).toHaveBeenCalledWith({
                cohort: '0-1000',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '',
                url: undefined,
            });
        });
    });

    it('submits url-only request when result is blank and url is provided', async () => {
        const tournament = createTournament();
        adminSetRoundRobinResultMock.mockResolvedValue({ data: tournament });
        renderDialog();

        fireEvent.change(screen.getByLabelText('Game URL (optional)'), {
            target: { value: 'https://lichess.org/xyz' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(adminSetRoundRobinResultMock).toHaveBeenCalledWith({
                cohort: '0-1000',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: undefined,
                url: 'https://lichess.org/xyz',
            });
        });
    });
});
