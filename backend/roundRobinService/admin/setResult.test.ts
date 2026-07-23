'use strict';

import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.hoisted(() => vi.fn());
const getSendMock = vi.hoisted(() => vi.fn());
const updateSendMock = vi.hoisted(() => vi.fn());
const updateOps = vi.hoisted(() => ({
    sets: [] as Array<{ path: unknown; value: unknown }>,
    removes: [] as unknown[],
}));
const parseGameMock = vi.hoisted(() => vi.fn());

vi.mock('../../directoryService/database', () => {
    class GetItemBuilder {
        key() {
            return this;
        }
        table() {
            return this;
        }
        send = getSendMock;
    }

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
        GetItemBuilder,
        UpdateItemBuilder,
    };
});

vi.mock('../gameUtils', () => ({
    parseGame: parseGameMock,
}));

vi.mock('../register', () => ({
    tournamentsTable: 'test-tournaments',
}));

import { handler } from './setResult';

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

function sampleTournament() {
    return {
        type: 'ROUND_ROBIN_1500-1600',
        startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
        cohort: '1500-1600',
        name: 'Test',
        startDate: '2024-06-01T00:00:00.000Z',
        endDate: '2024-07-01T00:00:00.000Z',
        players: {
            alice: { username: 'alice', displayName: 'Alice', status: 'ACTIVE' },
            bob: { username: 'bob', displayName: 'Bob', status: 'ACTIVE' },
        },
        playerOrder: ['alice', 'bob'],
        pairings: [
            [
                {
                    white: 'alice',
                    black: 'bob',
                    result: '1-0',
                    url: 'https://lichess.org/old',
                    submittedAt: '2024-06-02T00:00:00.000Z',
                },
            ],
        ],
        updatedAt: '2024-06-01T00:00:00.000Z',
    };
}

describe('admin setResult handler', () => {
    beforeEach(() => {
        getUserMock.mockReset();
        getSendMock.mockReset();
        updateSendMock.mockReset();
        parseGameMock.mockReset();
        updateOps.sets.length = 0;
        updateOps.removes.length = 0;
        getUserMock.mockResolvedValue({ isAdmin: true, isTournamentAdmin: false });
    });

    it('returns 403 when caller is not an admin', async () => {
        getUserMock.mockResolvedValue({ isAdmin: false, isTournamentAdmin: false });

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '1-0',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(403);
        expect(getSendMock).not.toHaveBeenCalled();
        expect(updateSendMock).not.toHaveBeenCalled();
    });

    it('allows tournament admins', async () => {
        getUserMock.mockResolvedValue({ isAdmin: false, isTournamentAdmin: true });
        getSendMock.mockResolvedValue(sampleTournament());
        updateSendMock.mockResolvedValue(sampleTournament());

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '0-1',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(getSendMock).toHaveBeenCalledOnce();
        expect(updateSendMock).toHaveBeenCalledOnce();
    });

    it('sets a manual result without url', async () => {
        getSendMock.mockResolvedValue(sampleTournament());
        updateSendMock.mockResolvedValue(sampleTournament());

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '1/2-1/2',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(parseGameMock).not.toHaveBeenCalled();
        expect(updateOps.sets).toEqual(
            expect.arrayContaining([
                { path: ['pairings', 0, 0, 'result'], value: '1/2-1/2' },
                expect.objectContaining({ path: ['pairings', 0, 0, 'submittedAt'] }),
            ]),
        );
        expect(updateOps.sets.some((s) => JSON.stringify(s.path).includes('"url"'))).toBe(false);
    });

    it('parses result from url when result is omitted', async () => {
        getSendMock.mockResolvedValue(sampleTournament());
        updateSendMock.mockResolvedValue(sampleTournament());
        parseGameMock.mockResolvedValue({
            type: 'lichess',
            white: 'alice_l',
            black: 'bob_l',
            result: '0-1',
        });

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                url: 'https://lichess.org/abc123',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(parseGameMock).toHaveBeenCalledWith('https://lichess.org/abc123');
        expect(updateOps.sets).toEqual(
            expect.arrayContaining([
                { path: ['pairings', 0, 0, 'result'], value: '0-1' },
                { path: ['pairings', 0, 0, 'url'], value: 'https://lichess.org/abc123' },
            ]),
        );
    });

    it('clears result, url, and submittedAt when result is empty string', async () => {
        getSendMock.mockResolvedValue(sampleTournament());
        updateSendMock.mockResolvedValue(sampleTournament());

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(updateOps.removes).toEqual([
            ['pairings', 0, 0, 'result'],
            ['pairings', 0, 0, 'url'],
            ['pairings', 0, 0, 'submittedAt'],
        ]);
        expect(parseGameMock).not.toHaveBeenCalled();
    });

    it('returns 404 when tournament is missing', async () => {
        getSendMock.mockResolvedValue(undefined);

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'alice',
                black: 'bob',
                result: '1-0',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(404);
    });

    it('returns 400 when pairing is not found', async () => {
        getSendMock.mockResolvedValue(sampleTournament());

        const res = (await handler(
            baseEvent({
                cohort: '1500-1600',
                startsAt: 'ACTIVE_2024-06-01T00:00:00.000Z',
                round: 1,
                white: 'carol',
                black: 'dave',
                result: '1-0',
            }),
            {} as never,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body || '{}').message).toMatch(/Pairing not found/);
    });
});
