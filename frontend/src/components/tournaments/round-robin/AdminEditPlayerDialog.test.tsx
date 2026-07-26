import { renderWithIntl } from '@/i18n/intl.test';
import {
    RoundRobinPlayer,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminEditPlayerDialog } from './AdminEditPlayerDialog';

const adminUpdateRoundRobinPlayerMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/roundRobinApi', () => ({
    adminUpdateRoundRobinPlayer: adminUpdateRoundRobinPlayerMock,
}));

const player: RoundRobinPlayer = {
    username: 'alice',
    displayName: 'Alice',
    lichessUsername: 'alice_l',
    chesscomUsername: 'alice_c',
    discordUsername: 'alice_d',
    discordId: '1',
    status: RoundRobinPlayerStatuses.ACTIVE,
};

describe('AdminEditPlayerDialog', () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn();

    afterEach(cleanup);

    beforeEach(() => {
        adminUpdateRoundRobinPlayerMock.mockReset();
        onClose.mockReset();
        onUpdate.mockReset();
    });

    function renderDialog() {
        return renderWithIntl(
            <AdminEditPlayerDialog
                open
                onClose={onClose}
                cohort='0-1000'
                startsAt='WAITING'
                player={player}
                onUpdate={onUpdate}
            />,
        );
    }

    it('shows validation errors when required fields are cleared', () => {
        renderDialog();

        fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: ' ' } });
        fireEvent.change(screen.getByLabelText('Lichess Username'), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        expect(screen.getAllByText('This field is required').length).toBe(2);
        expect(adminUpdateRoundRobinPlayerMock).not.toHaveBeenCalled();
    });

    it('submits updated player identity fields', async () => {
        const updated = { startsAt: 'WAITING', players: { alice: player } };
        adminUpdateRoundRobinPlayerMock.mockResolvedValue({ data: updated });
        renderDialog();

        fireEvent.change(screen.getByLabelText('Display Name'), {
            target: { value: 'Alice New' },
        });
        fireEvent.change(screen.getByLabelText('Lichess Username'), {
            target: { value: 'alice_lichess' },
        });
        fireEvent.change(screen.getByLabelText('Chess.com Username'), {
            target: { value: 'alice_chesscom' },
        });
        fireEvent.change(screen.getByLabelText('Discord Username'), {
            target: { value: 'alice#2' },
        });
        fireEvent.change(screen.getByLabelText('Discord ID'), {
            target: { value: '42' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));

        await waitFor(() => {
            expect(adminUpdateRoundRobinPlayerMock).toHaveBeenCalledWith({
                cohort: '0-1000',
                startsAt: 'WAITING',
                username: 'alice',
                displayName: 'Alice New',
                lichessUsername: 'alice_lichess',
                chesscomUsername: 'alice_chesscom',
                discordUsername: 'alice#2',
                discordId: '42',
            });
        });
        expect(onUpdate).toHaveBeenCalledWith(updated);
        expect(onClose).toHaveBeenCalled();
    });
});
