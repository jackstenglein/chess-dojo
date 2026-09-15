import { describe, expect, it } from 'vitest';
import { Game } from '../game/types';
import { buildSearchDocument, documentId } from './document';

function testGame(overrides: Partial<Game> = {}): Game {
    return {
        cohort: '1500-1600',
        id: '2026.07.01_abc-123',
        white: 'daniel naroditsky',
        black: 'magnus carlsen',
        date: '2026.06.15',
        createdAt: '2026-07-01T12:00:00Z',
        updatedAt: '2026-07-01T12:00:00Z',
        owner: 'user-1',
        ownerDisplayName: 'Kerv',
        headers: {
            White: 'Daniel Naroditsky',
            Black: 'Magnus Carlsen',
            WhiteElo: '2650',
            BlackElo: '2830',
            Result: '1-0',
            ECO: 'B12',
            Opening: 'Caro-Kann Defense',
            TimeControl: '600+5',
            PlyCount: '83',
        },
        pgn: '',
        orientation: 'white',
        comments: [],
        positionComments: {},
        unlisted: false,
        timelineId: '',
        ...overrides,
    } as Game;
}

describe('documentId', () => {
    it('joins cohort and id', () => {
        expect(documentId(testGame())).toBe('1500-1600#2026.07.01_abc-123');
    });
});

describe('buildSearchDocument', () => {
    it('builds a full document from a listed game', () => {
        expect(buildSearchDocument(testGame())).toEqual({
            cohort: '1500-1600',
            id: '2026.07.01_abc-123',
            white: 'Daniel Naroditsky',
            black: 'Magnus Carlsen',
            whiteElo: 2650,
            blackElo: 2830,
            avgElo: 2740,
            result: '1-0',
            eco: 'B12',
            opening: 'Caro-Kann Defense',
            date: '2026-06-15',
            createdAt: '2026-07-01T12:00:00Z',
            timeControl: '600+5',
            timeClass: 'rapid',
            plyCount: 83,
            owner: 'user-1',
            ownerDisplayName: 'Kerv',
        });
    });

    it('returns undefined for unlisted games', () => {
        expect(buildSearchDocument(testGame({ unlisted: true }))).toBeUndefined();
    });

    it('returns undefined for system-owned games', () => {
        expect(buildSearchDocument(testGame({ owner: 'model_games' }))).toBeUndefined();
        expect(buildSearchDocument(testGame({ owner: 'games_to_memorize' }))).toBeUndefined();
    });

    it('falls back to createdAt for calendar-invalid dates', () => {
        expect(buildSearchDocument(testGame({ date: '2024.13.45' }))?.date).toBe('2026-07-01');
        expect(buildSearchDocument(testGame({ date: '0000.00.00' }))?.date).toBe('2026-07-01');
    });

    it('derives the date from the id when createdAt is missing', () => {
        expect(
            buildSearchDocument(
                testGame({
                    date: '',
                    createdAt: undefined as unknown as string,
                    id: '2025.01.15_abc-123',
                }),
            )?.date,
        ).toBe('2025-01-15');
        expect(
            buildSearchDocument(testGame({ date: '', createdAt: '', id: 'no-date-id' }))?.date,
        ).toBe('1970-01-01');
    });

    it('omits timeClass for unknown time controls', () => {
        const doc = buildSearchDocument(
            testGame({ headers: { White: 'A', Black: 'B', TimeControl: '-' } }),
        );
        expect(doc?.timeClass).toBeUndefined();
    });

    it('omits elos that are missing or not numeric', () => {
        const doc = buildSearchDocument(
            testGame({ headers: { White: 'A', Black: 'B', WhiteElo: '?' } }),
        );
        expect(doc?.whiteElo).toBeUndefined();
        expect(doc?.blackElo).toBeUndefined();
        expect(doc?.avgElo).toBeUndefined();
    });

    it('omits avg elo if both players are not defined', () => {
        const doc = buildSearchDocument(
            testGame({ headers: { White: 'A', Black: 'B', WhiteElo: '2650' } }),
        );
        expect(doc?.whiteElo).toBe(2650);
        expect(doc?.blackElo).toBeUndefined();
        expect(doc?.avgElo).toBeUndefined();
    });

    it('falls back to createdAt for partial or missing dates', () => {
        expect(buildSearchDocument(testGame({ date: '2023.??.??' }))?.date).toBe('2026-07-01');
        expect(buildSearchDocument(testGame({ date: '' }))?.date).toBe('2026-07-01');
    });

    it('falls back to lowercase name fields when headers are missing', () => {
        const doc = buildSearchDocument(testGame({ headers: {} }));
        expect(doc?.white).toBe('daniel naroditsky');
        expect(doc?.black).toBe('magnus carlsen');
        expect(doc?.result).toBeUndefined();
        expect(doc?.eco).toBeUndefined();
    });
});
