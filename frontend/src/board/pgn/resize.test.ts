import { beforeEach, describe, expect, it } from 'vitest';
import { getFittedSizes, getNewSizes, getSizes, RESTORE_GUTTER_WIDTH } from './resize';

describe('collapsible panel sizing', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            writable: true,
            value: 1000,
        });
    });

    for (const width of [390, 599, 600, 899, 900, 1400]) {
        for (const left of [false, true]) {
            for (const right of [false, true]) {
                it(`fits ${width}px with left=${left}, right=${right}`, () => {
                    const options = { showPgn: right, showPanelControls: true };
                    const sizes = getSizes(width, left, false, options);
                    expect(sizes.board.width).toBe(sizes.board.height);
                    const rowWidth =
                        sizes.board.width +
                        (width >= 600 ? sizes.pgn.width : 0) +
                        (width >= 900 ? sizes.underboard.width : 0);
                    expect(rowWidth).toBeLessThanOrEqual(sizes.availableWidth + 0.001);
                    for (const data of [sizes.board, sizes.pgn, sizes.underboard]) {
                        expect(data.width).toBeGreaterThanOrEqual(data.minWidth);
                        expect(data.width).toBeLessThanOrEqual(data.maxWidth);
                        expect(data.height).toBeGreaterThanOrEqual(data.minHeight);
                        expect(data.height).toBeLessThanOrEqual(data.maxHeight);
                    }
                    if (width < 600) expect(sizes.board.width).toBe(width - sizes.padding);
                    if (left && width < 900) expect(sizes.underboard.order).toBe(1);

                    const resized = getNewSizes(
                        {
                            ...sizes,
                            board: {
                                ...sizes.board,
                                width: sizes.board.minWidth,
                                height: sizes.board.minHeight,
                            },
                        },
                        false,
                        options,
                    );
                    for (const [visible, panel] of [
                        [left, resized.underboard],
                        [right, resized.pgn],
                    ] as const) {
                        if (!visible) expect(Object.values(panel)).toEqual([0, 0, 0, 0, 0, 0]);
                    }
                    expect(resized.board.maxWidth).toBeGreaterThanOrEqual(resized.board.width);
                });
            }
        }
    }

    it('allocates initial desktop sizes based on available panels, symmetrically for either side', () => {
        window.innerHeight = 2000;
        const both = getSizes(1200, true, false, { showPanelControls: true });
        const leftOnly = getSizes(1200, true, false, { showPgn: false, showPanelControls: true });
        const rightOnly = getSizes(1200, false, false, { showPanelControls: true });
        const neither = getSizes(1200, false, false, { showPgn: false, showPanelControls: true });
        expect(leftOnly.board.width).toBeGreaterThan(both.board.width);
        expect(leftOnly.board.width).toBe(rightOnly.board.width);
        expect(neither.board.width).toBeGreaterThan(leftOnly.board.width);
        expect(neither.board.width).toBe(neither.availableWidth);
    });

    it.each([600, 900])('caps the board in a short viewport at %i px', (width) => {
        window.innerHeight = 400;
        const sizes = getSizes(width, true, false, { showPanelControls: true });
        const withoutHeaders = getSizes(width, true, true, { showPanelControls: true });
        expect(sizes.board.width).toBeCloseTo(400 - 80 - 64 - 48 - 2 * 27.9833);
        expect(sizes.board.minWidth).toBeLessThanOrEqual(sizes.board.maxWidth);
        expect(withoutHeaders.board.width - sizes.board.width).toBeCloseTo(2 * 27.9833);
    });

    it('uses the existing toolbar height without adding a row', () => {
        const legacy = getSizes(1800, true, false);
        const controls = getSizes(1800, true, false, { showPanelControls: true });
        expect(legacy.board.maxHeight - controls.board.maxHeight).toBe(0);
        expect(getSizes(800, true, false).board.width).toBe((800 - 6 - 4) * 0.66);
    });
});

describe('board fitting with hidden bars', () => {
    it.each([390, 599, 600, 899, 900, 1400])(
        'fits viewport and visible panels at %ipx',
        (width) => {
            for (const height of [400, 1000]) {
                window.innerHeight = height;
                const normal = getSizes(width, true, false, { showPanelControls: true });
                for (const left of [false, true]) {
                    for (const right of [false, true]) {
                        const fitted = getFittedSizes(normal, width, left, right);
                        const rowPanels =
                            (width >= 900 && left ? normal.underboard.width + normal.spacing : 0) +
                            (width >= 600 && right ? normal.pgn.width + normal.spacing : 0);
                        expect(fitted.board.width).toBe(fitted.board.height);
                        expect(
                            fitted.board.width + rowPanels + RESTORE_GUTTER_WIDTH + normal.padding,
                        ).toBeLessThanOrEqual(width + 0.001);
                        expect(fitted.board.height).toBeLessThanOrEqual(height - 80 - 64);
                        expect(fitted.pgn.width).toBe(normal.pgn.width);
                        expect(fitted.underboard.width).toBe(normal.underboard.width);
                    }
                }
            }
        },
    );

    it('reclaims header and control height without mutating the normal layout', () => {
        window.innerHeight = 800;
        const normal = getSizes(1800, true, false, { showPanelControls: true });
        const saved = structuredClone(normal);
        const fitted = getFittedSizes(normal, 1800, false, false);
        expect(fitted.board.width - normal.board.width).toBeCloseTo(2 * 27.9833 + 48);
        expect(normal).toEqual(saved);
    });

    it('shrinks when a panel is revealed and expands when a visible panel is resized smaller', () => {
        window.innerHeight = 2000;
        const normal = getSizes(1200, true, false, { showPanelControls: true });
        const hidden = getFittedSizes(normal, 1200, false, false);
        const revealed = getFittedSizes(normal, 1200, true, false);
        expect(revealed.board.width).toBeLessThan(hidden.board.width);
        const resized = getFittedSizes(
            { ...normal, underboard: { ...normal.underboard, width: 200 } },
            1200,
            true,
            false,
        );
        expect(resized.board.width).toBeGreaterThan(revealed.board.width);
    });
});
