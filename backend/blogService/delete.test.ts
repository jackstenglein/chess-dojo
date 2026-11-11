import { ConditionalCheckFailedException, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, expect, it, vi } from 'vitest';
import { handler } from './delete';
const { getUser, send } = vi.hoisted(() => ({ getUser: vi.fn(), send: vi.fn() }));
vi.mock('./database', () => ({ blogTable: 'test-blogs', getUser, dynamo: { send } }));
const event = {
    pathParameters: { owner: 'chessdojo', id: 'dojo-digest/vol-26' },
    requestContext: {
        authorizer: {
            jwt: { claims: { 'cognito:username': 'admin', email: 'admin@example.com' } },
        },
    },
} as unknown as APIGatewayProxyEventV2;
async function invoke(input = event) {
    return (await handler(
        input,
        {} as never,
        () => undefined,
    )) as APIGatewayProxyStructuredResultV2;
}
beforeEach(() => {
    vi.resetAllMocks();
    getUser.mockResolvedValue({ isAdmin: true });
    send.mockResolvedValue({});
});
it('deletes the exact blog key including nested slugs', async () => {
    expect((await invoke()).statusCode).toBe(200);
    const command = send.mock.calls[0][0] as DeleteItemCommand;
    expect(command).toBeInstanceOf(DeleteItemCommand);
    expect(command.input).toEqual({
        TableName: 'test-blogs',
        Key: { owner: { S: 'chessdojo' }, id: { S: 'dojo-digest/vol-26' } },
        ConditionExpression: 'attribute_exists(id)',
    });
});
it('rejects non-admins before deleting', async () => {
    getUser.mockResolvedValue({ isAdmin: false });
    expect((await invoke()).statusCode).toBe(403);
    expect(send).not.toHaveBeenCalled();
});
it('rejects unauthenticated callers', async () => {
    const anonymous = { ...event, requestContext: {} } as APIGatewayProxyEventV2;
    expect((await invoke(anonymous)).statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
});
it('returns 404 for a missing blog', async () => {
    send.mockRejectedValue(
        new ConditionalCheckFailedException({ message: 'missing', $metadata: {} }),
    );
    expect((await invoke()).statusCode).toBe(404);
});
