import {
    Directory,
    DirectoryItem,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/user';
import { NIL } from 'uuid';
import { describe, expect, it } from 'vitest';
import { getPerformanceStats } from './stats';

/**
 * Creates a mock directory with the given items.
 * @param items The items to add to the mock directory.
 */
function mockDirectory(items: DirectoryItem[]): Directory {
    return {
        owner: NIL,
        id: NIL,
        parent: NIL,
        name: 'Mock Directory',
        visibility: DirectoryVisibility.PUBLIC,
        createdAt: '',
        updatedAt: '',
        items: items.reduce(
            (acc, item) => {
                acc[item.id] = item;
                return acc;
            },
            {} as Record<string, DirectoryItem>,
        ),
        itemIds: items.map((item) => item.id),
    };
}

describe('getPerformanceStats', () => {
    it.each([
        {
            name: 'missing username returns empty stats',
            username: 'not found',
            directory: mockDirectory([
                {
                    type: 'OWNED_GAME',
                    id: '2000-2100/2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                    metadata: {
                        cohort: '2000-2100',
                        id: '2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                        owner: '642dc91f-955e-4f19-b170-39195cb449e1',
                        ownerDisplayName: 'Jalp p',
                        createdAt: '2025-05-16T16:40:24.214Z',
                        white: 'Kavutskiy, Kostya',
                        black: 'Otero Nogueira, Brais',
                        whiteElo: '2328',
                        blackElo: '2134',
                        result: '1/2-1/2',
                        unlisted: false,
                    },
                },
            ]),
            ratingSystem: RatingSystem.Fide,
            expected: {
                wins: { total: 0, white: 0, black: 0 },
                draws: { total: 0, white: 0, black: 0 },
                losses: { total: 0, white: 0, black: 0 },
                rating: { total: 0, white: 0, black: 0 },
                normalizedRating: { total: 0, white: 0, black: 0 },
                avgOppRating: { total: 0, white: 0, black: 0 },
                normalizedAvgOppRating: { total: 0, white: 0, black: 0 },
                cohortRatings: {},
            },
        },
        {
            name: 'empty directory returns empty stats',
            username: 'kostya',
            directory: mockDirectory([]),
            ratingSystem: RatingSystem.Fide,
            expected: {
                wins: { total: 0, white: 0, black: 0 },
                draws: { total: 0, white: 0, black: 0 },
                losses: { total: 0, white: 0, black: 0 },
                rating: { total: 0, white: 0, black: 0 },
                normalizedRating: { total: 0, white: 0, black: 0 },
                avgOppRating: { total: 0, white: 0, black: 0 },
                normalizedAvgOppRating: { total: 0, white: 0, black: 0 },
                cohortRatings: {},
            },
        },
        {
            name: 'directory with one item returns correct stats',
            username: 'Kavutskiy, Kostya',
            directory: mockDirectory([
                {
                    type: 'OWNED_GAME',
                    id: '2000-2100/2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                    metadata: {
                        cohort: '2000-2100',
                        id: '2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                        owner: '642dc91f-955e-4f19-b170-39195cb449e1',
                        ownerDisplayName: 'Jalp p',
                        createdAt: '2025-05-16T16:40:24.214Z',
                        white: 'Kavutskiy, Kostya',
                        black: 'Otero Nogueira, Brais',
                        whiteElo: '2328',
                        blackElo: '2134',
                        result: '1/2-1/2',
                        unlisted: false,
                    },
                },
            ]),
            ratingSystem: RatingSystem.Fide,
            expected: {
                wins: { total: 0, white: 0, black: 0 },
                draws: { total: 1, white: 1, black: 0 },
                losses: { total: 0, white: 0, black: 0 },
                rating: { total: 2134, white: 2134, black: 0 },
                normalizedRating: { total: 2134, white: 2134, black: 0 },
                avgOppRating: { total: 2134, white: 2134, black: 0 },
                normalizedAvgOppRating: { total: 2134, white: 2134, black: 0 },
                cohortRatings: {
                    '2100-2200': {
                        wins: { total: 0, white: 0, black: 0 },
                        draws: { total: 1, white: 1, black: 0 },
                        losses: { total: 0, white: 0, black: 0 },
                        rating: { total: 2134, white: 2134, black: 0 },
                        normalizedRating: { total: 2134, white: 2134, black: 0 },
                        avgOppRating: { total: 2134, white: 2134, black: 0 },
                        normalizedAvgOppRating: { total: 2134, white: 2134, black: 0 },
                    },
                },
            },
        },
        {
            name: 'directory with two items returns correct stats',
            username: 'Kavutskiy, Kostya',
            directory: mockDirectory([
                {
                    type: 'OWNED_GAME',
                    id: '2000-2100/2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                    metadata: {
                        cohort: '2000-2100',
                        id: '2025.05.16_99f6d83a-4af7-4be7-a3c5-64e24988c905',
                        owner: '642dc91f-955e-4f19-b170-39195cb449e1',
                        ownerDisplayName: 'Jalp p',
                        createdAt: '2025-05-16T16:40:24.214Z',
                        white: 'Kavutskiy, Kostya',
                        black: 'Otero Nogueira, Brais',
                        whiteElo: '2328',
                        blackElo: '2134',
                        result: '1/2-1/2',
                        unlisted: false,
                    },
                },
                {
                    type: 'OWNED_GAME',
                    id: '2000-2100/2025.05.16_0d939c67-48bb-4efd-8cd2-5d822b0b6319',
                    metadata: {
                        cohort: '2000-2100',
                        id: '2025.05.16_0d939c67-48bb-4efd-8cd2-5d822b0b6319',
                        owner: '642dc91f-955e-4f19-b170-39195cb449e1',
                        ownerDisplayName: 'Jalp p',
                        createdAt: '2025-05-16T16:48:18.094Z',
                        white: 'Beck, Michael',
                        black: 'Kavutskiy, Kostya',
                        whiteElo: '2071',
                        blackElo: '2328',
                        result: '0-1',
                        unlisted: false,
                    },
                },
            ]),
            ratingSystem: RatingSystem.Fide,
            expected: {
                wins: { total: 1, white: 0, black: 1 },
                draws: { total: 1, white: 1, black: 0 },
                losses: { total: 0, white: 0, black: 0 },
                rating: { total: 2296, white: 2134, black: 2471 },
                normalizedRating: { total: 2296, white: 2134, black: 2471 },
                avgOppRating: { total: 2103, white: 2134, black: 2071 },
                normalizedAvgOppRating: { total: 2103, white: 2134, black: 2071 },
                cohortRatings: {
                    '2000-2100': {
                        wins: { total: 1, white: 0, black: 1 },
                        draws: { total: 0, white: 0, black: 0 },
                        losses: { total: 0, white: 0, black: 0 },
                        rating: { total: 2471, white: 0, black: 2471 },
                        normalizedRating: { total: 2471, white: 0, black: 2471 },
                        avgOppRating: { total: 2071, white: 0, black: 2071 },
                        normalizedAvgOppRating: { total: 2071, white: 0, black: 2071 },
                    },
                    '2100-2200': {
                        wins: { total: 0, white: 0, black: 0 },
                        draws: { total: 1, white: 1, black: 0 },
                        losses: { total: 0, white: 0, black: 0 },
                        rating: { total: 2134, white: 2134, black: 0 },
                        normalizedRating: { total: 2134, white: 2134, black: 0 },
                        avgOppRating: { total: 2134, white: 2134, black: 0 },
                        normalizedAvgOppRating: { total: 2134, white: 2134, black: 0 },
                    },
                },
            },
        },
    ])('$name', ({ username, ratingSystem, directory, expected }) => {
        expect(getPerformanceStats(username, directory, ratingSystem)).toEqual(expected);
    });
});
