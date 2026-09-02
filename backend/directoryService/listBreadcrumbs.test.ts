import { marshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { NIL as uuidNil } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canViewDirectory } from './access';
import { dynamo } from './database';
import { fetchBreadcrumbs } from './listBreadcrumbs';

vi.mock('./access', () => ({
    canViewDirectory: vi.fn(),
    fetchSubscriptionTier: vi.fn(),
}));
vi.mock('./database', () => ({
    directoryTable: 'test-directories',
    dynamo: { send: vi.fn() },
}));

const owner = 'owner';
const viewer = 'viewer';
const childId = '2bca0358-bbfc-46f0-b28d-e850ded0ba5c';
const parentId = 'b62fefb4-2c01-4d0b-bf9e-379642163a39';

function directory(id: string, parent: string, name: string): Directory {
    return {
        owner,
        id,
        parent,
        name,
        visibility: DirectoryVisibility.PRIVATE,
        items: {},
        itemIds: [],
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
    };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('fetchBreadcrumbs', () => {
    it('makes a tier-shared child the root when its parent is inaccessible', async () => {
        vi.mocked(dynamo.send)
            .mockResolvedValueOnce({
                Item: marshall(directory(childId, parentId, 'Child')),
            } as never)
            .mockResolvedValueOnce({
                Item: marshall(directory(parentId, uuidNil, 'Parent')),
            } as never);
        vi.mocked(canViewDirectory).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

        const result = await fetchBreadcrumbs({
            owner,
            id: childId,
            viewer,
            subscriptionTier: SubscriptionTier.Basic,
        });

        expect(result).toEqual({
            [`${owner}/${childId}`]: {
                owner,
                id: childId,
                name: 'Child',
                parent: uuidNil,
            },
        });
    });
});
