import { marshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryVisibility,
    HOME_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { NIL as uuidNil } from 'uuid';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler } from './share';

const mocks = vi.hoisted(() => ({
    checkAccess: vi.fn(),
    fetchDirectory: vi.fn(),
    updateDirectory: vi.fn(),
    dynamoSend: vi.fn(),
}));

vi.mock('./access', () => ({ checkAccess: mocks.checkAccess }));
vi.mock('./get', () => ({ fetchDirectory: mocks.fetchDirectory }));
vi.mock('./update', () => ({ updateDirectory: mocks.updateDirectory }));
vi.mock('./database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./database')>();
    return { ...actual, dynamo: { send: mocks.dynamoSend } };
});

const owner = 'owner';
const id = '2bca0358-bbfc-46f0-b28d-e850ded0ba5c';

function directory(overrides: Partial<Directory> = {}): Directory {
    return {
        owner,
        id,
        parent: uuidNil,
        name: 'Folder',
        visibility: DirectoryVisibility.PRIVATE,
        access: {},
        items: {},
        itemIds: [],
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
        ...overrides,
    };
}

function event(body: object, directoryId = id): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        requestContext: {
            authorizer: { jwt: { claims: { 'cognito:username': owner }, scopes: [] } },
        },
        pathParameters: { owner, id: directoryId },
    } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.checkAccess.mockResolvedValue(true);
});

describe('share handler', () => {
    it('makes a public directory private before storing tier access', async () => {
        const publicDirectory = directory({ visibility: DirectoryVisibility.PUBLIC });
        const privateDirectory = directory();
        const parent = directory({ id: 'b62fefb4-2c01-4d0b-bf9e-379642163a39' });
        mocks.fetchDirectory.mockResolvedValue(publicDirectory);
        mocks.updateDirectory.mockResolvedValue({ directory: privateDirectory, parent });
        mocks.dynamoSend.mockResolvedValue({ Attributes: marshall(privateDirectory) });

        const response = (await handler(
            event({ access: {}, subscriptionTiers: [SubscriptionTier.Basic] }),
            {} as never,
            () => undefined,
        )) as APIGatewayProxyStructuredResultV2;

        expect(mocks.updateDirectory).toHaveBeenCalledWith({
            owner,
            id,
            visibility: DirectoryVisibility.PRIVATE,
        });
        expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
        expect(
            Object.values(mocks.dynamoSend.mock.calls[0][0].input.ExpressionAttributeNames),
        ).toContain('subscriptionTiers');
        expect(
            Object.values(mocks.dynamoSend.mock.calls[0][0].input.ExpressionAttributeValues),
        ).toContainEqual({ L: [{ S: SubscriptionTier.Basic }] });
        expect(JSON.parse(response.body!)).toMatchObject({
            directory: { subscriptionTiers: [SubscriptionTier.Basic] },
            parent,
        });
    });

    it('preserves stored tiers when an old client omits the field', async () => {
        const existing = directory({ subscriptionTiers: [SubscriptionTier.Lecture] });
        mocks.fetchDirectory.mockResolvedValue(existing);
        mocks.dynamoSend.mockResolvedValue({ Attributes: marshall(existing) });

        const response = (await handler(
            event({ access: {} }),
            {} as never,
            () => undefined,
        )) as APIGatewayProxyStructuredResultV2;

        expect(mocks.updateDirectory).not.toHaveBeenCalled();
        expect(
            Object.values(mocks.dynamoSend.mock.calls[0][0].input.ExpressionAttributeNames),
        ).not.toContain('subscriptionTiers');
        expect(JSON.parse(response.body!)).toMatchObject({
            directory: { subscriptionTiers: [SubscriptionTier.Lecture] },
        });
    });

    it('rejects tier sharing on a default directory', async () => {
        mocks.fetchDirectory.mockResolvedValue(directory({ id: HOME_DIRECTORY_ID }));

        const response = (await handler(
            event({ access: {}, subscriptionTiers: [SubscriptionTier.Basic] }, HOME_DIRECTORY_ID),
            {} as never,
            () => undefined,
        )) as APIGatewayProxyStructuredResultV2;

        expect(response.statusCode).toBe(400);
        expect(mocks.updateDirectory).not.toHaveBeenCalled();
        expect(mocks.dynamoSend).not.toHaveBeenCalled();
    });
});
