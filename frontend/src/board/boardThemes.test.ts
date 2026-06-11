import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getCoordinateSx } from './boardThemes';
import { CoordinateSize } from './pgn/boardTools/underboard/settings/viewerSettingsConstants';

vi.mock('./pgn/boardTools/underboard/settings/ViewerSettings', () => ({
    BoardStyle: {
        Standard: 'STANDARD',
        Moon: 'MOON',
        Summer: 'SUMMER',
        Wood: 'WOOD',
        Walnut: 'WALNUT',
        CherryBlossom: 'CHERRY_BLOSSOM',
        Ocean: 'OCEAN',
    },
    PieceStyle: {
        Standard: 'STANDARD',
        Pixel: 'PIXEL',
        Spatial: 'WOOD',
        Celtic: 'CELTIC',
        Fantasy: 'FANTASY',
        Chessnut: 'CHERRY',
        Cburnett: 'WALNUT',
        ThreeD: 'THREE_D',
        ThreeDRedBlue: 'THREE_D_RED_BLUE',
        Disguised: 'DISGUISED',
        Invisible: 'INVISIBLE',
    },
}));

describe('getCoordinateSx', () => {
    it('returns the default Chessground coordinate values for standard coordinates', () => {
        expect(getCoordinateSx(CoordinateSize.Standard)).toEqual({
            '--coordinate-font-size': '9px',
            '--coordinate-font-weight': 600,
            '--coordinate-opacity': 0.8,
        });
    });

    it('returns more readable values for large coordinates', () => {
        expect(getCoordinateSx(CoordinateSize.Large)).toEqual({
            '--coordinate-font-size': '13px',
            '--coordinate-font-weight': 800,
            '--coordinate-opacity': 1,
        });
    });
});

describe('board coordinate stylesheet contract', () => {
    it('uses coordinate CSS variables for size, weight, and opacity', () => {
        const cssPath = path.resolve(process.cwd(), 'src/board/board.css');
        const css = readFileSync(cssPath, 'utf8');

        expect(css).toContain('font-size: var(--coordinate-font-size, 9px)');
        expect(css).toContain('font-weight: var(--coordinate-font-weight, 600)');
        expect(css).toContain('opacity: var(--coordinate-opacity, 0.8)');
    });
});
