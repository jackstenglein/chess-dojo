import { marshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryItemTypes,
    DirectoryVisibility,
    ExportDirectoryRequest,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { NIL as uuidNil } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canViewDirectory } from './access';
import { dynamo } from './database';
import { fetchGameInfoFromDirectories } from './export';

vi.mock('./access', () => ({
    canViewDirectory: vi.fn(),
    fetchSubscriptionTier: vi.fn(),
}));
vi.mock('./database', () => ({
    directoryTable: 'test-directories',
    dynamo: { send: vi.fn() },
    gameTable: 'test-games',
    UpdateItemBuilder: vi.fn(),
}));

const owner = 'owner';
const username = 'viewer';
const parentId = '2bca0358-bbfc-46f0-b28d-e850ded0ba5c';
const childId = 'b62fefb4-2c01-4d0b-bf9e-379642163a39';

function directory(id: string, items: Directory['items'] = {}): Directory {
    return {
        owner,
        id,
        parent: uuidNil,
        name: 'Folder',
        visibility: DirectoryVisibility.PRIVATE,
        items,
        itemIds: Object.keys(items),
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
    };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('fetchGameInfoFromDirectories', () => {
    it('rejects an inaccessible top-level directory', async () => {
        vi.mocked(dynamo.send).mockResolvedValue({
            Responses: { 'test-directories': [marshall(directory(parentId))] },
        } as never);
        vi.mocked(canViewDirectory).mockResolvedValue(false);

        await expect(
            fetchGameInfoFromDirectories(
                username,
                { directories: [{ owner, id: parentId }] } as ExportDirectoryRequest,
                SubscriptionTier.Basic,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('skips an inaccessible recursive child', async () => {
        const parent = directory(parentId, {
            game: {
                id: 'game',
                type: DirectoryItemTypes.OWNED_GAME,
                addedBy: owner,
                metadata: {
                    id: 'game',
                    cohort: '1000-1099',
                    owner,
                    createdAt: '2026-08-31T10:00:00.000Z',
                    white: 'White',
                    black: 'Black',
                },
            },
            [childId]: {
                id: childId,
                type: DirectoryItemTypes.DIRECTORY,
                addedBy: owner,
                metadata: {
                    name: 'Child',
                    visibility: DirectoryVisibility.PRIVATE,
                    createdAt: '2026-08-31T10:00:00.000Z',
                    updatedAt: '2026-08-31T10:00:00.000Z',
                },
            },
        });
        vi.mocked(dynamo.send)
            .mockResolvedValueOnce({
                Responses: { 'test-directories': [marshall(parent)] },
            } as never)
            .mockResolvedValueOnce({
                Responses: { 'test-directories': [marshall(directory(childId))] },
            } as never);
        vi.mocked(canViewDirectory).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

        await expect(
            fetchGameInfoFromDirectories(
                username,
                {
                    directories: [{ owner, id: parentId }],
                    recursive: true,
                } as ExportDirectoryRequest,
                SubscriptionTier.Basic,
            ),
        ).resolves.toEqual([{ cohort: '1000-1099', id: 'game' }]);
    });
});
