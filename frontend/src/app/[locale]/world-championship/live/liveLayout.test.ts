import { describe, expect, it } from 'vitest';
import {
    FAN_PARTS,
    fanBoardBlockSx,
    fanLandscapeGrid,
    FanPart,
    fanPartSx,
    fanSmallLandscapeGrid,
    fanTopBarSx,
    fanTwoColumnGrid,
    fanUprightWideGrid,
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
    expect(rows.every((row) => row.length === rows[0].length)).toBe(true);
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

describe('the fan view on a large tablet held upright', () => {
    const rows = rowsOf(fanUprightWideGrid);

    it('draws a grid the browser accepts', () => {
        expect(rows.every((row) => row.length === 2)).toBe(true);
        for (const name of new Set(rows.flat())) {
            const at = rows.flatMap((row, y) =>
                row.flatMap((cell, x) => (cell === name ? [`${x},${y}`] : [])),
            );
            // Every part is in one row, in one cell or in both.
            expect(new Set(at.map((cell) => cell.split(',')[1])).size, name).toBe(1);
        }
    });

    it('gives the board and everything up to the senseis the full width', () => {
        for (const part of ['top', 'board', 'bottom', 'nav', 'guess', 'evals']) {
            expect(rows).toContainEqual([part, part]);
        }
    });

    it('shows the stream and the leaderboard side by side, then the moves and the crosstable', () => {
        const stream = rows.findIndex(([left]) => left === 'twitch');
        expect(rows[stream]).toEqual(['twitch', 'leaders']);
        expect(rows[stream + 1]).toEqual(['moves', 'cross']);
        expect(stream).toBeGreaterThan(rows.findIndex(([left]) => left === 'evals'));
    });

    it('has a place for every part', () => {
        for (const part of FAN_PARTS) {
            expect(rows.flat(), part).toContain(part);
        }
    });
});

describe('the fan view on a phone on its side', () => {
    const rows = rowsOf(fanLandscapeGrid);
    /** The parts beside the board, from the top, row by row. */
    const beside = rows.map(([, ...side]) => [...new Set(side)].join(' and '));

    it('draws a grid the browser accepts', () => {
        expectValidGrid(fanLandscapeGrid);
    });

    it('shows the game picker, both players, the stream and the guess first', () => {
        expect(beside.slice(0, 4)).toEqual(['games', 'top and bottom', 'twitch', 'guess']);
    });

    it('gives the board every row of its column, so nothing is under it', () => {
        expect(rows.every(([left]) => left === 'board')).toBe(true);
    });

    it('keeps the board in view while the page scrolls', () => {
        expect(fanPartSx('board')[PHONE_LANDSCAPE]).toMatchObject({ position: 'sticky' });
        expect(fanPartSx('twitch')[PHONE_LANDSCAPE]).toEqual({ gridArea: 'twitch' });
    });

    it('gives every part a place of its own in the grid', () => {
        // The browser puts a part without a place into the first empty row.
        for (const part of FAN_PARTS) {
            expect(rows.flat(), part).toContain(part);
            expect(fanPartSx(part)[PHONE_LANDSCAPE].gridArea, part).toBe(part);
        }
    });

    it('puts the crosstable last', () => {
        expect(beside.filter((part) => part !== '.').at(-1)).toBe('cross');
    });

    it('gives each player a line on a small phone, and changes nothing else', () => {
        const small = rowsOf(fanSmallLandscapeGrid);
        expectValidGrid(fanSmallLandscapeGrid);
        expect(small.slice(1, 3)).toEqual([
            ['board', 'top', 'top'],
            ['board', 'bottom', 'bottom'],
        ]);
        expect([small[0], ...small.slice(3)]).toEqual([rows[0], ...rows.slice(2)]);
    });
});
