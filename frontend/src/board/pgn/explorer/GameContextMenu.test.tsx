import { GameContext } from '@/context/useGame';
import { Game, GameInfo } from '@/database/game';
import { useDataGridContextMenu } from '@/hooks/useDataGridContextMenu';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameContextMenu } from './GameContextMenu';

const mocks = vi.hoisted(() => ({
    getGame: vi.fn(),
    reconcile: vi.fn(),
    chess: undefined as Chess | undefined,
}));
vi.mock('@/api/Api', () => ({ useApi: () => ({ getGame: mocks.getGame }) }));
vi.mock('@/board/Board', () => ({ useReconcile: () => mocks.reconcile }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: () => ({ chess: mocks.chess }) }));

function Harness({
    source,
    owner = true,
    unsaved = false,
}: {
    source: GameInfo;
    owner?: boolean;
    unsaved?: boolean;
}) {
    const menu = useDataGridContextMenu();
    return (
        <GameContext.Provider
            value={{ game: { cohort: '1500-1600', id: 'target' } as Game, isOwner: owner, unsaved }}
        >
            <div data-testid='row' data-id={source.id} onContextMenu={menu.open}>
                Source game
            </div>
            <GameContextMenu
                source={menu.rowIds[0] === source.id ? source : undefined}
                menu={menu}
            />
        </GameContext.Provider>
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('database game menu', () => {
    it('closes immediately on a second right-click and can reopen without an overlay delay', () => {
        mocks.chess = new Chess();
        renderWithIntl(<Harness source={{ id: 'source' } as GameInfo} />);
        fireEvent.contextMenu(screen.getByTestId('row'));
        expect(screen.getByRole('menu')).toBeVisible();
        expect(fireEvent.contextMenu(screen.getByRole('presentation'))).toBe(false);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
        fireEvent.contextMenu(screen.getByTestId('row'));
        expect(screen.getByRole('menu')).toBeVisible();
    });

    it.each(['masters', '1500-1600'])(
        'inserts the right source from %s and preserves navigation during the fetch',
        async (cohort) => {
            const source = {
                cohort,
                id: 'source',
                headers: { White: 'Source', Black: 'Opponent' },
                pgn: '1. e4 c5 *',
            } as Game;
            mocks.chess = new Chess({ pgn: '1. e4 e5 *' });
            mocks.chess.seek(mocks.chess.history()[0]);
            const { promise, resolve } = Promise.withResolvers<{ data: Game }>();
            mocks.getGame.mockReturnValue(promise);
            renderWithIntl(<Harness source={source} />);
            fireEvent.contextMenu(screen.getByTestId('row'));
            fireEvent.click(screen.getByRole('menuitem', { name: 'Insert game with citation' }));
            expect(
                screen.getByRole('menuitem', { name: 'Insert game with citation' }),
            ).toHaveAttribute('aria-disabled', 'true');
            expect(screen.getByRole('menuitem', { name: 'Cite game' })).toHaveAttribute(
                'aria-disabled',
                'true',
            );
            const selected = mocks.chess.history()[1];
            mocks.chess.seek(selected);
            await act(async () => {
                resolve({ data: source });
                await Promise.resolve();
            });
            await screen.findByText('Game inserted.');
            expect(mocks.getGame).toHaveBeenCalledWith(cohort, 'source');
            expect(mocks.chess.currentMove()).toBe(selected);
            expect(mocks.chess.renderPgn()).toContain('Source - Opponent');
            expect(mocks.reconcile).toHaveBeenCalled();
        },
    );

    it.each([
        { owner: false, unsaved: false, editable: false },
        { owner: false, unsaved: true, editable: true },
    ])('respects editing permissions: %j', ({ owner, unsaved, editable }) => {
        mocks.chess = new Chess();
        renderWithIntl(
            <Harness source={{ id: 'source' } as GameInfo} owner={owner} unsaved={unsaved} />,
        );
        fireEvent.contextMenu(screen.getByTestId('row'));
        expect(!!screen.queryByRole('menuitem', { name: 'Cite game' })).toBe(editable);
        expect(screen.getByRole('menuitem', { name: 'Open game in new tab' })).toBeVisible();
    });
});
