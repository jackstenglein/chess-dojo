'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.hoisted(() => vi.fn());
const updateSendMock = vi.hoisted(() => vi.fn());
const updateOps = vi.hoisted(() => ({
    sets: [] as Array<{ path: unknown; value: unknown }>,
}));

vi.mock('../../directoryService/database', () => {
    class UpdateItemBuilder {
        key() {
            return this;
        }
        set(path: unknown, value: unknown) {
            updateOps.sets.push({ path, value });
            return this;
        }
        condition() {
            return this;
        }
        table() {
            return this;
        }
        return() {
            return this;
        }
        send = updateSendMock;
    }

    return {
        getUser: getUserMock,
        attributeExists: vi.fn(() => ({})),
        UpdateItemBuilder,
    };
});

vi.mock('../register', () => ({
    tournamentsTable: 'test-tournaments',
}));

import { handler } from './updatePlayer';

function baseEvent(body: Record<string, unknown>): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        requestContext: {
            authorizer: {
                jwt: {
                    claims: {
                        'cognito:username': 'admin',
                        email: 'admin@example.com',
                    },
                },
            },
        },
    } as unknown as APIGatewayProxyEventV2;
}

const validBody = {
    cohort: '1500-1600',
    startsAt: 'WAITING',
    username: 'alice',
    displayName: 'Alice Updated',
    lichessUsername: 'alice_lichess',
    chesscomUsername: 'alice_chesscom',
    discordUsername: 'alice#0001',
    discordId: '999',
};

describe('admin updatePlayer handler', () => {
    beforeEach(() => {
        getUserMock.mockReset();
        updateSendMock.mockReset();
        updateOps.sets.length = 0;
        getUserMock.mockResolvedValue({ isAdmin: true, isTournamentAdmin: false });
    });

    it('returns 403 when caller is not an admin', async () => {
        getUserMock.mockResolvedValue({ isAdmin: false, isTournamentAdmin: false });

        const res = (await handler(
            baseEvent(validBody),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(403);
        expect(updateSendMock).not.toHaveBeenCalled();
    });

    it('updates player identity fields and returns the tournament', async () => {
        const updated = { ...validBody, players: { alice: validBody } };
        updateSendMock.mockResolvedValue(updated);

        const res = (await handler(
            baseEvent(validBody),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body || '{}')).toEqual(updated);
        expect(updateOps.sets).toEqual(
            expect.arrayContaining([
                { path: ['players', 'alice', 'displayName'], value: 'Alice Updated' },
                { path: ['players', 'alice', 'lichessUsername'], value: 'alice_lichess' },
                { path: ['players', 'alice', 'chesscomUsername'], value: 'alice_chesscom' },
                { path: ['players', 'alice', 'discordUsername'], value: 'alice#0001' },
                { path: ['players', 'alice', 'discordId'], value: '999' },
                expect.objectContaining({ path: 'updatedAt' }),
            ]),
        );
    });

    it('returns 404 when the player does not exist', async () => {
        updateSendMock.mockRejectedValue(
            new ConditionalCheckFailedException({
                message: 'conditional',
                $metadata: {},
            }),
        );

        const res = (await handler(
            baseEvent(validBody),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res.body || '{}').message).toMatch(/Player not found/);
    });

    it('returns 400 for invalid request body', async () => {
        const res = (await handler(
            baseEvent({ cohort: '1500-1600' }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(400);
        expect(updateSendMock).not.toHaveBeenCalled();
    });
});
