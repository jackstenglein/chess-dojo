import { describe, expect, it } from 'vitest';
import {
    FAN_PARTS,
    fanLandscapeGrid,
    FanPart,
    fanPartSx,
    parseLayout,
    PHONE,
    PHONE_LANDSCAPE,
    resolveLayout,
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

    it('puts the stream above the moves, and the leaderboard and crosstable last', () => {
        const order = (['evals', 'twitch', 'moves', 'leaders', 'cross'] as const).map(place);
        expect(order).toEqual([...order].sort((a, b) => a - b));
    });
});

describe('the fan view on a phone on its side', () => {
    const rows = [...fanLandscapeGrid.gridTemplateAreas.matchAll(/"([^"]+)"/g)].map((m) =>
        m[1].split(' '),
    );

    it('draws a grid the browser accepts', () => {
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
        const tracks = fanLandscapeGrid.gridTemplateRows.match(/minmax\([^)]*\)|\S+/g);
        expect(tracks).toHaveLength(rows.length);
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
