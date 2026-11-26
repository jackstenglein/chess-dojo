import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GamePicker } from './GamePicker';
import { MatchRound } from './lichessFeed';

const rounds: MatchRound[] = [
    { id: 'r1', name: 'Game 1', number: 1, ongoing: false, finished: true },
    { id: 'r2', name: 'Game 2', number: 2, ongoing: true, finished: false },
    { id: 'r3', name: 'Game 3', number: 3, ongoing: false, finished: false },
    { id: 'x1', name: 'A game a sensei added', number: 1000, ongoing: false, finished: false, pgnUrl: 'https://lichess.org/x1.pgn' }, // prettier-ignore
];

/** The names in the list of games, once it is open. */
function openList() {
    fireEvent.click(screen.getByRole('button', { name: 'Choose a game' }));
    return within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((item) => item.textContent);
}

describe('GamePicker', () => {
    afterEach(cleanup);

    it('names the game on the page and says when it is live', () => {
        render(<GamePicker rounds={rounds} roundId='r2' onSelect={() => undefined} />);
        const title = screen.getByRole('button', { name: 'Choose a game' });
        expect(title.textContent).toBe('Game 2');
        expect(within(title).getByRole('img', { name: 'live' })).toBeDefined();
    });

    it('shows how a finished game ended, beside its name and in the list', () => {
        render(
            <GamePicker
                rounds={rounds}
                roundId='r1'
                onSelect={() => undefined}
                results={{ r1: '½–½' }}
            />,
        );
        expect(screen.getByRole('button', { name: 'Choose a game' }).textContent).toBe('Game 1½–½');
        expect(openList()).toEqual(['Game 1½–½', 'Game 2LIVE', 'Game 3', 'A game a sensei added']);
    });

    it('steps to the game before and the game after', () => {
        const onSelect = vi.fn<(id: string) => void>();
        render(<GamePicker rounds={rounds} roundId='r2' onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'Previous game' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next game' }));
        expect(onSelect.mock.calls).toEqual([['r1'], ['r3']]);
    });

    it('has nowhere to step from the first and the last game', () => {
        const { rerender } = render(
            <GamePicker rounds={rounds} roundId='r1' onSelect={() => undefined} />,
        );
        expect(screen.getByRole('button', { name: 'Previous game' })).toHaveProperty(
            'disabled',
            true,
        );
        rerender(<GamePicker rounds={rounds} roundId='x1' onSelect={() => undefined} />);
        expect(screen.getByRole('button', { name: 'Next game' })).toHaveProperty('disabled', true);
    });

    it('lists every game and opens the one that is chosen', () => {
        const onSelect = vi.fn<(id: string) => void>();
        render(<GamePicker rounds={rounds} roundId='r2' onSelect={onSelect} />);
        expect(openList()).toEqual(['Game 1', 'Game 2LIVE', 'Game 3', 'A game a sensei added']);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Game 3' }));
        expect(onSelect).toHaveBeenCalledWith('r3');
    });

    it('lists Admin last, and only for an admin', () => {
        const onOpen = vi.fn();
        const { unmount } = render(
            <GamePicker rounds={rounds} roundId='r2' onSelect={() => undefined} />,
        );
        expect(openList()).not.toContain('Admin');
        unmount();

        render(
            <GamePicker
                rounds={rounds}
                roundId='r2'
                onSelect={() => undefined}
                admin={{ open: false, onOpen }}
            />,
        );
        expect(openList().at(-1)).toBe('Admin');
        fireEvent.click(screen.getByRole('menuitem', { name: 'Admin' }));
        expect(onOpen).toHaveBeenCalled();
    });

    it('lets a sensei remove a game they added, and only such a game', () => {
        const onSelect = vi.fn<(id: string) => void>();
        const onRemove = vi.fn<(id: string) => void>();
        render(<GamePicker rounds={rounds} roundId='r2' onSelect={onSelect} onRemove={onRemove} />);
        openList();
        expect(screen.queryByRole('button', { name: 'Remove Game 1' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Remove A game a sensei added' }));
        expect(onRemove).toHaveBeenCalledWith('x1');
        expect(onSelect).not.toHaveBeenCalled();
    });
});
