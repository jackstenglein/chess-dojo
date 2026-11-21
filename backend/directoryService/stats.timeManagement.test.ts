import { marshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryItem,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { NIL } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dynamo } from './database';
import { aggregateDirectoryTimeManagement, getDirectoryTimeManagementRating } from './stats';

vi.mock('./database', () => ({
    gameTable: 'test-games',
    dynamo: { send: vi.fn() },
}));

function ownedGame(
    id: string,
    metadata: {
        white: string;
        black: string;
        date?: string;
        createdAt?: string;
    },
): DirectoryItem {
    return {
        type: 'OWNED_GAME',
        id,
        metadata: {
            cohort: '2000-2100',
            id,
            owner: 'owner',
            createdAt: metadata.createdAt ?? '2024-01-01T00:00:00.000Z',
            white: metadata.white,
            black: metadata.black,
            result: '1-0',
            date: metadata.date,
        },
    };
}

function mockDirectory(items: DirectoryItem[]): Directory {
    return {
        owner: NIL,
        id: NIL,
        parent: NIL,
        name: 'Mock Directory',
        visibility: DirectoryVisibility.PUBLIC,
        createdAt: '',
        updatedAt: '',
        items: Object.fromEntries(items.map((item) => [item.id, item])),
        itemIds: items.map((item) => item.id),
    };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('aggregateDirectoryTimeManagement', () => {
    it('applies games in date order so later games use the Elo adjustment', () => {
        const early = Array.from({ length: 10 }, (_, index) => ({
            date: '2020.01.01',
            createdAt: `2020-01-01T00:00:0${index}.000Z`,
            rating: 2000,
            area: 0,
        }));

        const rating = aggregateDirectoryTimeManagement([
            { date: '2021.01.01', createdAt: '2021-01-01T00:00:00.000Z', rating: 1000, area: 0 },
            ...early,
        ]);

        expect(rating).toEqual({ currentRating: 1984, numGames: 11, area: 0 });
    });

    it('skips games without a time management rating', () => {
        expect(
            aggregateDirectoryTimeManagement([
                { rating: undefined, area: 10 },
                { rating: -1, area: 10 },
                { rating: 1800, area: -20 },
            ]),
        ).toEqual({ currentRating: 1800, numGames: 1, area: -20 });
    });

    it('returns an empty aggregate when no game has a rating', () => {
        expect(aggregateDirectoryTimeManagement([])).toEqual({ currentRating: 0, numGames: 0 });
    });
});

describe('getDirectoryTimeManagementRating', () => {
    it('aggregates the selected color and ignores other games', async () => {
        const directory = mockDirectory([
            ownedGame('later', {
                white: 'Kostya',
                black: 'Opponent',
                date: '2024.06.01',
                createdAt: '2024-06-02T00:00:00.000Z',
            }),
            ownedGame('earlier', {
                white: 'Opponent',
                black: 'Kavutskiy, Kostya',
                date: '2024.01.01',
                createdAt: '2024-01-02T00:00:00.000Z',
            }),
            ownedGame('missing-clock', {
                white: 'Kostya',
                black: 'Opponent',
                date: '2024.03.01',
            }),
            {
                type: 'MASTER_GAME',
                id: 'master',
                metadata: {
                    cohort: '2000-2100',
                    id: 'master',
                    owner: 'owner',
                    createdAt: '2024-02-01T00:00:00.000Z',
                    white: 'Kostya',
                    black: 'Opponent',
                    result: '1-0',
                },
            },
            ownedGame('other-player', {
                white: 'Someone Else',
                black: 'Opponent',
                date: '2024.02.01',
            }),
        ]);

        vi.mocked(dynamo.send).mockResolvedValue({
            Responses: {
                'test-games': [
                    marshall({
                        cohort: '2000-2100',
                        id: 'later',
                        timeManagementRatingWhite: 2000,
                        timeManagementAreaWhite: 20,
                        timeManagementRatingBlack: 1400,
                        timeManagementAreaBlack: 5,
                    }),
                    marshall({
                        cohort: '2000-2100',
                        id: 'earlier',
                        timeManagementRatingWhite: 1500,
                        timeManagementAreaWhite: 4,
                        timeManagementRatingBlack: 1800,
                        timeManagementAreaBlack: -20,
                    }),
                    marshall({
                        cohort: '2000-2100',
                        id: 'missing-clock',
                        timeManagementRatingWhite: -1,
                        timeManagementAreaWhite: 0,
                    }),
                ],
            },
        } as never);

        await expect(getDirectoryTimeManagementRating('kostya', directory)).resolves.toEqual({
            currentRating: 1900,
            numGames: 2,
            area: 0,
        });
        expect(dynamo.send).toHaveBeenCalledTimes(1);
    });

    it('retries games DynamoDB did not return in the first batch', async () => {
        const directory = mockDirectory([
            ownedGame('first', { white: 'Kostya', black: 'Opponent', date: '2024.01.01' }),
            ownedGame('second', { white: 'Kostya', black: 'Opponent', date: '2024.02.01' }),
        ]);
        vi.mocked(dynamo.send)
            .mockResolvedValueOnce({
                Responses: {
                    'test-games': [
                        marshall({
                            cohort: '2000-2100',
                            id: 'first',
                            timeManagementRatingWhite: 1800,
                            timeManagementAreaWhite: -20,
                        }),
                    ],
                },
                UnprocessedKeys: {
                    'test-games': {
                        Keys: [marshall({ cohort: '2000-2100', id: 'second' })],
                    },
                },
            } as never)
            .mockResolvedValueOnce({
                Responses: {
                    'test-games': [
                        marshall({
                            cohort: '2000-2100',
                            id: 'second',
                            timeManagementRatingWhite: 2000,
                            timeManagementAreaWhite: 20,
                        }),
                    ],
                },
            } as never);

        await expect(getDirectoryTimeManagementRating('Kostya', directory)).resolves.toEqual({
            currentRating: 1900,
            numGames: 2,
            area: 0,
        });
        expect(dynamo.send).toHaveBeenCalledTimes(2);
    });

    it('does not read games when the player is absent', async () => {
        const directory = mockDirectory([
            ownedGame('game', { white: 'Opponent', black: 'Someone' }),
        ]);

        await expect(getDirectoryTimeManagementRating('Kostya', directory)).resolves.toEqual({
            currentRating: 0,
            numGames: 0,
        });
        expect(dynamo.send).not.toHaveBeenCalled();
    });
});
