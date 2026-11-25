import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Crosstable } from './crosstable';
import { CrosstableView } from './CrosstableView';

// next/image loads the photos, and a test has no use for it.
vi.mock('./PlayerPhoto', () => ({ PlayerPhoto: () => null }));

const table: Crosstable = {
    games: Array.from({ length: 14 }, (_, i) => ({
        number: i + 1,
        white: i % 2 === 0 ? 'gukesh' : 'sindarov',
        result: i === 0 ? '1/2-1/2' : '*',
    })),
    totals: { gukesh: 0.5, sindarov: 0.5 },
};

/** Makes every media query answer as a phone or as a wide screen would. */
function onScreen(phone: boolean) {
    vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
            ({
                matches: phone,
                media: query,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
            }) as unknown as MediaQueryList,
    );
}

/** The game numbers in the header of each table on the page. */
function gameRows() {
    return screen.getAllByRole('table').map((t) =>
        within(t)
            .getAllByRole('columnheader')
            .map((h) => h.textContent)
            .filter((text) => /^\d+$/.test(text ?? '')),
    );
}

describe('CrosstableView', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const all = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

    it('shows the 14 games in one row with a score column on a wide screen', () => {
        onScreen(false);
        render(<CrosstableView table={table} onSelectGame={() => undefined} />);
        expect(gameRows()).toEqual([all]);
        expect(screen.getByText('Score')).toBeDefined();
        expect(screen.queryByTestId('crosstable-score')).toBeNull();
    });

    it('shows the score on a line of its own on a phone, not in the table', () => {
        onScreen(true);
        render(<CrosstableView table={table} onSelectGame={() => undefined} />);
        expect(gameRows()).toEqual([all]);
        expect(screen.queryByText('Score')).toBeNull();
        expect(screen.getByTestId('crosstable-score').textContent).toBe('Gukesh½ : ½Sindarov');
    });

    it('opens a game from the table on a phone', () => {
        onScreen(true);
        const onSelectGame = vi.fn<(number: number) => void>();
        render(<CrosstableView table={table} onSelectGame={onSelectGame} />);
        fireEvent.click(screen.getByText('9'));
        expect(onSelectGame).toHaveBeenCalledWith(9);
        fireEvent.click(screen.getByTestId('cross-sindarov-3'));
        expect(onSelectGame).toHaveBeenCalledWith(3);
    });
});
