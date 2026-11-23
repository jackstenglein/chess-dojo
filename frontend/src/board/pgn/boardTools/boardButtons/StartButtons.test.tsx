import { ChessContext } from '@/board/pgn/PgnBoard';
import { GameContext } from '@/context/useGame';
import { Game } from '@/database/game';
import { renderWithIntl } from '@/i18n/intl.test';
import { Chess } from '@jackstenglein/chess';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import StartButtons from './StartButtons';

function renderMenu(disableExport: boolean, headers?: Record<string, string>) {
    const value = { chess: new Chess(), config: { disableExport } };
    const game = headers ? ({ headers } as unknown as Game) : undefined;
    renderWithIntl(
        <GameContext.Provider value={{ game, isOwner: true }}>
            <ChessContext.Provider value={value}>
                <StartButtons />
            </ChessContext.Provider>
        </GameContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button'));
}

describe('StartButtons', () => {
    afterEach(() => {
        cleanup();
    });

    it('offers Copy PGN when the game may be exported', () => {
        renderMenu(false);
        expect(screen.getByRole('menuitem', { name: 'Copy PGN' })).toBeTruthy();
    });

    it('hides Copy PGN when the course disables export', () => {
        renderMenu(true);
        expect(screen.queryByRole('menuitem', { name: 'Copy PGN' })).toBeNull();
        expect(screen.getByRole('menuitem', { name: 'Copy FEN' })).toBeTruthy();
    });

    it('hides Copy PGN on a working copy of a course that disables export', () => {
        renderMenu(false, { StudyItem: 'course:STUDY/s/m/0', StudyExport: 'false' });
        expect(screen.queryByRole('menuitem', { name: 'Copy PGN' })).toBeNull();
    });

    it('offers Copy PGN with no game context, as on the analysis board', () => {
        const value = { chess: new Chess(), config: { disableExport: false } };
        renderWithIntl(
            <ChessContext.Provider value={value}>
                <StartButtons />
            </ChessContext.Provider>,
        );
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByRole('menuitem', { name: 'Copy PGN' })).toBeTruthy();
    });

    it('offers Copy PGN on a working copy of a course that allows export', () => {
        renderMenu(false, { StudyItem: 'course:STUDY/s/m/0', StudyExport: 'true' });
        expect(screen.getByRole('menuitem', { name: 'Copy PGN' })).toBeTruthy();
    });
});
