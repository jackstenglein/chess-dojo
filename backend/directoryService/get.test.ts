import { marshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryItemTypes,
    DirectoryVisibility,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    SubscriptionStatus,
    SubscriptionTier,
    User,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { NIL as uuidNil } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlerV2 } from './get';

const mocks = vi.hoisted(() => ({
    dynamoSend: vi.fn(),
    getUser: vi.fn(),
}));

vi.mock('./database', () => ({
    directoryTable: 'test-directories',
    dynamo: { send: mocks.dynamoSend },
    getUser: mocks.getUser,
}));

const owner = 'owner';
const viewer = 'viewer';
const rootId = 'b62fefb4-2c01-4d0b-bf9e-379642163a39';
const childId = '2bca0358-bbfc-46f0-b28d-e850ded0ba5c';
const grandchildId = '50e0ea95-bd24-48e1-a9a7-cdff4ca2e66a';
const gameId = '1000-1100/2026.09.01_game';
const now = '2026-09-01T10:00:00.000Z';

function subdirectoryItem(id: string, name: string) {
    return {
        type: DirectoryItemTypes.DIRECTORY,
        id,
        metadata: {
            createdAt: now,
            updatedAt: now,
            visibility: DirectoryVisibility.PRIVATE,
            name,
        },
    } as const;
}

function directory(
    id: string,
    parent: string,
    items: Directory['items'],
    subscriptionTiers?: Directory['subscriptionTiers'],
): Directory {
    return {
        owner,
        id,
        parent,
        name: id,
        visibility: DirectoryVisibility.PRIVATE,
        items,
        itemIds: Object.keys(items),
        ...(subscriptionTiers ? { subscriptionTiers } : {}),
        createdAt: now,
        updatedAt: now,
    };
}

function event(): APIGatewayProxyEventV2 {
    return {
        requestContext: {
            authorizer: { jwt: { claims: { 'cognito:username': viewer }, scopes: [] } },
        },
        pathParameters: { owner, id: rootId },
    } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
    vi.resetAllMocks();

    const directories: Record<string, Directory> = {
        [rootId]: directory(rootId, uuidNil, { [childId]: subdirectoryItem(childId, 'Child') }, [
            SubscriptionTier.Basic,
        ]),
        [childId]: directory(childId, rootId, {
            [grandchildId]: subdirectoryItem(grandchildId, 'Grandchild'),
        }),
        [grandchildId]: directory(grandchildId, childId, {
            [gameId]: {
                type: DirectoryItemTypes.OWNED_GAME,
                id: gameId,
                metadata: {
                    cohort: '1000-1100',
                    id: '2026.09.01_game',
                    owner,
                    createdAt: now,
                    white: 'White',
                    black: 'Black',
                    unlisted: true,
                },
            },
        }),
    };

    mocks.dynamoSend.mockImplementation((command) => {
        const id = command.input.Key.id.S as string;
        return Promise.resolve({ Item: marshall(directories[id]) });
    });
    mocks.getUser.mockResolvedValue({
        subscriptionStatus: SubscriptionStatus.Subscribed,
        subscriptionTier: SubscriptionTier.Basic,
    } as User);
});

describe('get directory handler', () => {
    it('counts games through three levels of inherited tier access', async () => {
        const response = (await handlerV2(
            event(),
            {} as never,
            () => undefined,
        )) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body!);
        expect(body.directory.items[childId].metadata.gameCount).toBe(1);
    });
});
