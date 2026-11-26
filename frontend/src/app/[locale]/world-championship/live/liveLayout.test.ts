import { describe, expect, it } from 'vitest';
import {
    FAN_PARTS,
    fanBoardBlockSx,
    fanLandscapeGrid,
    FanPart,
    fanPartSx,
    fanTopBarSx,
    fanTwoColumnGrid,
    parseLayout,
    PHONE,
    PHONE_LANDSCAPE,
    resolveLayout,
    TWO_COLUMNS,
} from './liveLayout';

describe('parseLayout', () => {
    it('keeps the three layouts', () => {
        expect(parseLayout('stream')).toBe('stream');
        expect(parseLayout('analysis')).toBe('analysis');
        expect(parseLayout('analysis2')).toBe('analysis2');
    });

    it('drops anything else', () => {
        expect(parseLayout(undefined)).toBeNull();
        expect(parseLayout('')).toBeNull();
        expect(parseLayout('sideways')).toBeNull();
    });
});

describe('resolveLayout', () => {
    it('gives a viewer the stream view, whatever was saved', () => {
        expect(resolveLayout(null, false)).toBe('stream');
        expect(resolveLayout('analysis', false)).toBe('stream');
        expect(resolveLayout('analysis2', false)).toBe('stream');
    });

    it('starts a sensei on the analysis view', () => {
        expect(resolveLayout(null, true)).toBe('analysis');
    });

    it('keeps the view a sensei chose', () => {
        expect(resolveLayout('stream', true)).toBe('stream');
        expect(resolveLayout('analysis', true)).toBe('analysis');
        expect(resolveLayout('analysis2', true)).toBe('analysis2');
    });
});

describe('the fan view on a phone held upright', () => {
    const place = (part: FanPart) => fanPartSx(part)[PHONE].order;

    it('stacks the board between the players, with its buttons under it', () => {
        expect(['top', 'board', 'bottom', 'nav'].map((p) => place(p as FanPart))).toEqual([
            0, 1, 2, 3,
        ]);
    });

    it('shows the guess before anything that is not part of the board', () => {
        const rest: FanPart[] = ['evals', 'moves', 'twitch', 'leaders', 'cross'];
        expect(place('guess')).toBeGreaterThan(place('nav'));
        for (const part of rest) {
            expect(place(part)).toBeGreaterThan(place('guess'));
        }
    });

    it('puts the stream and the leaderboard above the moves, and the crosstable last', () => {
        const order = (['evals', 'twitch', 'leaders', 'moves', 'cross'] as const).map(place);
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });
});

/** The rows of a grid template, each a list of the names in it. */
function rowsOf(grid: { gridTemplateAreas: string }): string[][] {
    return [...grid.gridTemplateAreas.matchAll(/"([^"]+)"/g)].map((m) => m[1].split(' '));
}

/** Fails unless the browser would accept the grid. */
function expectValidGrid(grid: { gridTemplateAreas: string; gridTemplateRows: string }) {
    const rows = rowsOf(grid);
    expect(rows.every((row) => row.length === 2)).toBe(true);
    // An area that is not one rectangle makes the browser drop the whole grid.
    for (const name of new Set(rows.flat().filter((cell) => cell !== '.'))) {
        const cells = rows.flatMap((row, y) =>
            row.flatMap((cell, x) => (cell === name ? [{ x, y }] : [])),
        );
        const width = Math.max(...cells.map((c) => c.x)) - Math.min(...cells.map((c) => c.x));
        const height = Math.max(...cells.map((c) => c.y)) - Math.min(...cells.map((c) => c.y));
        expect(cells, name).toHaveLength((width + 1) * (height + 1));
    }
    expect(grid.gridTemplateRows.match(/minmax\([^)]*\)|\S+/g)).toHaveLength(rows.length);
}

describe('the fan view in two columns', () => {
    const rows = rowsOf(fanTwoColumnGrid);
    /** The parts beside the board, from the top. */
    const beside = rows.map(([, right]) => right).filter((part) => part !== '.');

    it('draws a grid the browser accepts', () => {
        expectValidGrid(fanTwoColumnGrid);
    });

    it('starts with the game picker, the guess, the stream and the leaderboard', () => {
        expect(beside.slice(0, 4)).toEqual(['games', 'guess', 'twitch', 'leaders']);
    });

    it('puts every other part after those, beside the board', () => {
        expect(beside.slice(4)).toEqual(['evals', 'moves', 'cross', 'notice']);
    });

    it('leaves nothing under the board, which spans every row', () => {
        expect(rows.every(([left]) => left === '.')).toBe(true);
        // Grid lines count from 1, so the line under the last row is one more
        // than the number of rows.
        expect(fanTopBarSx[TWO_COLUMNS].gridArea).toBe(`1 / 1 / ${rows.length + 1} / 2`);
        expect(fanBoardBlockSx[TWO_COLUMNS].gridArea).toBe(`2 / 1 / ${rows.length + 1} / 2`);
    });
});

describe('the fan view on a phone on its side', () => {
    const rows = rowsOf(fanLandscapeGrid);

    it('draws a grid the browser accepts', () => {
        expectValidGrid(fanLandscapeGrid);
    });

    it('keeps the players, the guess and the move buttons beside the board', () => {
        const besideBoard = rows.filter(([left]) => left === 'board').map(([, right]) => right);
        expect(besideBoard).toEqual(['top', 'guess', '.', 'nav', 'bottom']);
    });

    it('gives every part a place of its own in the grid', () => {
        // The browser puts a part without a place into the first empty row, which
        // is between the board and the moves while a game is being played.
        for (const part of FAN_PARTS) {
            expect(rows.flat(), part).toContain(part);
            expect(fanPartSx(part)[PHONE_LANDSCAPE].gridArea, part).toBe(part);
        }
    });

    it('puts the crosstable last, under everything else', () => {
        expect(rows.at(-1)).toEqual(['cross', 'cross']);
    });

    it('lets only the board set the width of its column', () => {
        const underBoard = rows
            .filter(([left, right]) => left !== 'board' && left !== right)
            .map(([left]) => left as FanPart);
        expect(underBoard).toEqual(['error', 'moves', 'evals']);
        for (const part of underBoard) {
            expect(fanPartSx(part)[PHONE_LANDSCAPE], part).toMatchObject({
                width: 0,
                minWidth: '100%',
            });
        }
        expect(fanPartSx('board')[PHONE_LANDSCAPE]).toEqual({ gridArea: 'board' });
    });

    it('lists its rules after the ones for any phone, so they win where both apply', () => {
        // A phone on its side matches both media queries, and the later one decides.
        const keys = Object.keys(fanPartSx('guess'));
        expect(keys.indexOf(PHONE_LANDSCAPE)).toBeGreaterThan(keys.indexOf(PHONE));
    });
});
