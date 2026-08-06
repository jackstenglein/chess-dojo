'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getBlogMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const sendMock = vi.hoisted(() => vi.fn());
const updateOps = vi.hoisted(() => ({
    sets: [] as Array<{ path: unknown; value: unknown }>,
    removes: [] as unknown[],
    condition: undefined as unknown,
}));

vi.mock('./database', () => {
    class UpdateItemBuilder {
        key() {
            return this;
        }
        set(path: unknown, value: unknown) {
            updateOps.sets.push({ path, value });
            return this;
        }
        remove(path: unknown) {
            updateOps.removes.push(path);
            return this;
        }
        condition(value: unknown) {
            updateOps.condition = value;
            return this;
        }
        table() {
            return this;
        }
        return() {
            return this;
        }
        build() {
            return { input: 'update-comment-reaction' };
        }
    }

    return {
        blogTable: 'test-blogs',
        dynamo: { send: sendMock },
        getUser: getUserMock,
        UpdateItemBuilder,
        attributeExists: (path: unknown) => ({ type: 'exists', path }),
        attributeNotExists: (path: unknown) => ({ type: 'not-exists', path }),
        equal: (path: unknown, value: unknown) => ({ type: 'equal', path, value }),
        and: (...conditions: unknown[]) => ({ type: 'and', conditions }),
        or: (...conditions: unknown[]) => ({ type: 'or', conditions }),
    };
});

vi.mock('./get', () => ({
    getBlog: getBlogMock,
}));

import { handler } from './updateCommentReaction';

function makeEvent(body: Record<string, unknown>, username = 'testuser'): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        pathParameters: { owner: 'chessdojo', id: 'post-1' },
        requestContext: username
            ? {
                  authorizer: {
                      jwt: {
                          claims: {
                              'cognito:username': username,
                          },
                      },
                  },
              }
            : {},
    } as unknown as APIGatewayProxyEventV2;
}

function makeBlog(comment: Record<string, unknown>, status = 'PUBLISHED') {
    return {
        owner: 'chessdojo',
        id: 'post-1',
        status,
        comments: [{ id: 'comment-1', ...comment }],
    };
}

function mockSuccessfulUpdate() {
    sendMock.mockResolvedValue({
        Attributes: marshall({
            owner: 'chessdojo',
            id: 'post-1',
            status: 'PUBLISHED',
            comments: [],
        }),
    });
}

async function invoke(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    return (await handler(event, {} as never, () => {})) as APIGatewayProxyStructuredResultV2;
}

describe('updateCommentReaction handler', () => {
    beforeEach(() => {
        getBlogMock.mockReset();
        getUserMock.mockReset();
        sendMock.mockReset();
        updateOps.sets.length = 0;
        updateOps.removes.length = 0;
        updateOps.condition = undefined;
        getUserMock.mockResolvedValue({
            displayName: 'Test User',
            dojoCohort: '1500-1600',
        });
    });

    it('returns 400 for an unauthenticated request', async () => {
        const response = await invoke(
            makeEvent({ commentId: 'comment-1', reactionType: '👍' }, ''),
        );

        expect(response.statusCode).toBe(400);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns 400 for an unsupported reaction', async () => {
        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '🚀' }));

        expect(response.statusCode).toBe(400);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns 404 when the blog does not exist', async () => {
        getBlogMock.mockResolvedValue(undefined);

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '👍' }));

        expect(response.statusCode).toBe(404);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns 403 when the blog is unpublished', async () => {
        getBlogMock.mockResolvedValue(makeBlog({}, 'DRAFT'));

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '👍' }));

        expect(response.statusCode).toBe(403);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns 404 when the comment does not exist', async () => {
        getBlogMock.mockResolvedValue({ status: 'PUBLISHED', comments: [] });

        const response = await invoke(
            makeEvent({ commentId: 'missing-comment', reactionType: '👍' }),
        );

        expect(response.statusCode).toBe(404);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('initializes reactions on a legacy comment', async () => {
        getBlogMock.mockResolvedValue(makeBlog({}));
        mockSuccessfulUpdate();

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '👍' }));

        expect(response.statusCode).toBe(200);
        expect(updateOps.sets).toEqual([
            {
                path: ['comments', 0, 'reactions'],
                value: {
                    testuser: expect.objectContaining({
                        username: 'testuser',
                        displayName: 'Test User',
                        cohort: '1500-1600',
                        types: ['👍'],
                    }),
                },
            },
        ]);
    });

    it('adds a reaction to an initialized reactions map', async () => {
        getBlogMock.mockResolvedValue(makeBlog({ reactions: {} }));
        mockSuccessfulUpdate();

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '❤️' }));

        expect(response.statusCode).toBe(200);
        expect(updateOps.sets).toEqual([
            {
                path: ['comments', 0, 'reactions', 'testuser'],
                value: expect.objectContaining({
                    username: 'testuser',
                    displayName: 'Test User',
                    cohort: '1500-1600',
                    types: ['❤️'],
                }),
            },
        ]);
    });

    it('replaces the authenticated user reaction with a different reaction', async () => {
        getBlogMock.mockResolvedValue(
            makeBlog({
                reactions: {
                    testuser: {
                        username: 'testuser',
                        displayName: 'Old Name',
                        cohort: '1400-1500',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                        types: ['❤️'],
                    },
                },
            }),
        );
        mockSuccessfulUpdate();

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '👍' }));

        expect(response.statusCode).toBe(200);
        expect(updateOps.sets[0]).toEqual({
            path: ['comments', 0, 'reactions', 'testuser'],
            value: expect.objectContaining({
                displayName: 'Test User',
                cohort: '1500-1600',
                types: ['👍'],
            }),
        });
    });

    it('removes the authenticated user reaction when toggling the same reaction', async () => {
        getBlogMock.mockResolvedValue(
            makeBlog({
                reactions: {
                    testuser: {
                        username: 'testuser',
                        displayName: 'Test User',
                        cohort: '1500-1600',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                        types: ['🎉'],
                    },
                },
            }),
        );
        mockSuccessfulUpdate();

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '🎉' }));

        expect(response.statusCode).toBe(200);
        expect(updateOps.sets).toHaveLength(0);
        expect(updateOps.removes).toEqual([['comments', 0, 'reactions', 'testuser']]);
    });

    it('returns 409 when the comment reactions changed concurrently', async () => {
        getBlogMock.mockResolvedValue(makeBlog({ reactions: {} }));
        sendMock.mockRejectedValue(
            new ConditionalCheckFailedException({
                message: 'Conditional request failed',
                $metadata: {},
            }),
        );

        const response = await invoke(makeEvent({ commentId: 'comment-1', reactionType: '👍' }));

        expect(response.statusCode).toBe(409);
    });
});
