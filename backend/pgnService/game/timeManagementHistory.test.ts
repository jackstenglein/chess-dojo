import { marshall } from '@aws-sdk/util-dynamodb';
import { newTimeManagementRating } from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aggregateTimeManagementRatings, rebuildUserTimeManagementRating } from './timeManagement';

const mocks = vi.hoisted(() => ({ getDirectory: vi.fn(), batchGet: vi.fn(), update: vi.fn() }));

vi.mock('./database', () => ({
    directoriesTable: 'test-directories',
    gamesTable: 'test-games',
    usersTable: 'test-users',
    dynamo: { send: mocks.batchGet },
}));

vi.mock('../../directoryService/database', () => {
    class GetItemBuilder {
        key() {
            return this;
        }
        table() {
            return this;
        }
        send() {
            return mocks.getDirectory();
        }
    }
    class UpdateItemBuilder {
        values: Record<string, unknown> = {};
        key() {
            return this;
        }
        table() {
            return this;
        }
        set(key: string, value: unknown) {
            this.values[key] = value;
            return this;
        }
        send() {
            return mocks.update(this.values);
        }
    }
    return { GetItemBuilder, UpdateItemBuilder };
});

type RatedGame = Parameters<typeof aggregateTimeManagementRatings>[0][number];
function game(date: string, rating: number, extra: Partial<RatedGame> = {}): RatedGame {
    return {
        date,
        createdAt: '2026-11-20T10:00:00Z',
        orientation: 'white',
        timeManagementRatingWhite: rating,
        timeManagementAreaWhite: 10,
        ...extra,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    mocks.update.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('aggregateTimeManagementRatings', () => {
    it('keeps the existing aggregate calculation while recording chronological daily ratings', () => {
        const result = aggregateTimeManagementRatings([
            game('2026.11.20', 1800),
            game('2026.11.18', 2000),
            game('2026.11.19', 2200),
        ]);
        expect(result.rating).toEqual({ currentRating: 2000, numGames: 3, area: 10 });
        expect(result.history).toEqual([
            { date: '2026-11-18', rating: 2000 },
            { date: '2026-11-19', rating: 2100 },
            { date: '2026-11-20', rating: 2000 },
        ]);
    });

    it('includes older games in the rating but not in the displayed year', () => {
        const result = aggregateTimeManagementRatings([
            game('2025.11.19', 1000),
            game('2025.11.20', 2000),
            game('2026.11.20', 3000),
        ]);
        expect(result.rating.numGames).toBe(3);
        expect(result.history).toEqual([
            { date: '2025-11-20', rating: 1500 },
            { date: '2026-11-20', rating: 2000 },
        ]);
    });

    it('uses the player orientation and the final aggregate for games on the same day', () => {
        const result = aggregateTimeManagementRatings([
            game('2026.11.20', 1000),
            game('2026.11.20', 1000, {
                orientation: 'black',
                timeManagementRatingBlack: 2000,
                timeManagementAreaBlack: -20,
            }),
        ]);
        expect(result.rating).toEqual({ currentRating: 1500, numGames: 2, area: -5 });
        expect(result.history).toEqual([{ date: '2026-11-20', rating: 1500 }]);
    });

    it('ignores missing and invalid ratings but preserves a valid zero rating', () => {
        const result = aggregateTimeManagementRatings([
            game('2026.11.18', -1),
            game('2026.11.19', 2000, { timeManagementRatingWhite: undefined }),
            game('2026.11.20', 0),
        ]);
        expect(result.rating.numGames).toBe(1);
        expect(result.history).toEqual([{ date: '2026-11-20', rating: 0 }]);
    });

    it('uses the upload date when the PGN date is unknown', () => {
        expect(aggregateTimeManagementRatings([game('????.??.??', 1800)]).history).toEqual([
            { date: '2026-11-20', rating: 1800 },
        ]);
    });

    it('orders upload-date fallbacks alongside PGN dates before building the history', () => {
        const result = aggregateTimeManagementRatings([game('', 2400), game('2026.11.19', 1800)]);
        expect(result.history).toEqual([
            { date: '2026-11-19', rating: 1800 },
            { date: '2026-11-20', rating: 2100 },
        ]);
    });

    it('keeps the Elo result unchanged after the provisional period', () => {
        const games = Array.from({ length: 12 }, (_, i) =>
            game(`2026.11.${String(i + 1).padStart(2, '0')}`, 1000 + i * 100),
        );
        let expected: ReturnType<typeof newTimeManagementRating> | undefined;
        for (const entry of games) {
            expected = newTimeManagementRating(expected, entry.timeManagementRatingWhite ?? 0, 10);
        }
        const result = aggregateTimeManagementRatings(games);
        expect(result.rating).toEqual(expected);
        expect(result.history.at(-1)?.rating).toBe(expected?.currentRating);
    });
});

describe('rebuildUserTimeManagementRating history persistence', () => {
    it('writes the aggregate and history together using cached games from My Games', async () => {
        mocks.getDirectory.mockResolvedValue({
            items: { one: { type: 'GAME', id: '1000-1100/game-one' } },
        });
        mocks.batchGet.mockResolvedValue({
            Responses: { 'test-games': [marshall(game('2026.11.20', 1800))] },
        });
        await rebuildUserTimeManagementRating('owner');
        expect(mocks.update).toHaveBeenCalledWith({
            timeManagementRating: { currentRating: 1800, numGames: 1, area: 10 },
            timeManagementRatingHistory: [{ date: '2026-11-20', rating: 1800 }],
        });
    });

    it('clears stale ratings and history after the last game is removed', async () => {
        mocks.getDirectory.mockResolvedValue({ items: {} });
        await rebuildUserTimeManagementRating('owner');
        expect(mocks.batchGet).not.toHaveBeenCalled();
        expect(mocks.update).toHaveBeenCalledWith({
            timeManagementRating: { currentRating: 0, numGames: 0 },
            timeManagementRatingHistory: [],
        });
    });
});
