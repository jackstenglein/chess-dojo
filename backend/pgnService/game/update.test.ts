'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game, GameUpdate } from './types';

const { mockSend } = vi.hoisted(() => {
    const mockSend = vi.fn();
    return { mockSend };
});

vi.mock('@aws-sdk/client-dynamodb', async () => {
    const actual = await vi.importActual<typeof import('@aws-sdk/client-dynamodb')>(
        '@aws-sdk/client-dynamodb',
    );
    class MockDynamoDBClient {
        send = mockSend;
    }
    return {
        ...actual,
        DynamoDBClient: MockDynamoDBClient,
    };
});

import { applyUpdate } from './update';

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        cohort: '1800-1900',
        id: '2025.06.17_game',
        white: 'White',
        black: 'Black',
        date: '2025.06.17',
        createdAt: '2025-06-17T00:00:00.000Z',
        updatedAt: '2025-06-17T12:00:00.000Z',
        owner: 'test-user',
        ownerDisplayName: 'Test User',
        ownerPreviousCohort: '',
        headers: {
            White: 'White',
            Black: 'Black',
            Date: '2025.06.17',
            Site: '',
            Result: '*',
        },
        orientation: 'white',
        comments: [],
        positionComments: {},
        unlisted: true,
        pgn: '1. e4 e5 *',
        ...overrides,
    };
}

describe('applyUpdate', () => {
    beforeEach(() => {
        mockSend.mockReset();
    });

    it('succeeds when owner and updatedAt match', async () => {
        const existing = makeGame();
        mockSend.mockResolvedValue({
            Attributes: marshall(existing, { removeUndefinedValues: true }),
        });

        const update = {
            updatedAt: '2025-06-18T00:00:00.000Z',
            pgn: '1. e4 e5 2. Nf3 *',
        };
        const result = await applyUpdate(
            'test-user',
            existing.cohort,
            existing.id,
            update,
            existing.updatedAt,
        );

        expect(result.old.pgn).toBe(existing.pgn);
        expect(result.new.pgn).toBe(update.pgn);
        expect(result.new.updatedAt).toBe(update.updatedAt);

        const command = mockSend.mock.calls[0][0];
        expect(command.input.ConditionExpression).toContain('#updatedAt = :expectedUpdatedAt');
        expect(command.input.ExpressionAttributeValues[':expectedUpdatedAt']).toEqual({
            S: existing.updatedAt,
        });
        expect(command.input.ReturnValuesOnConditionCheckFailure).toBe('ALL_OLD');
    });

    it('does not require updatedAt for non-PGN updates', async () => {
        const existing = makeGame();
        mockSend.mockResolvedValue({
            Attributes: marshall(existing, { removeUndefinedValues: true }),
        });

        const update: GameUpdate = {
            orientation: 'black',
            updatedAt: '2025-06-18T00:00:00.000Z',
        };
        const result = await applyUpdate(
            'test-user',
            existing.cohort,
            existing.id,
            update,
            undefined,
        );

        expect(result.old.pgn).toBe(existing.pgn);
        expect(result.new.orientation).toBe(update.orientation);
        expect(result.new.updatedAt).toBe(update.updatedAt);

        const command = mockSend.mock.calls[0][0];
        expect(command.input.ConditionExpression).not.toContain('#updatedAt = :expectedUpdatedAt');
        expect(command.input.ExpressionAttributeValues[':expectedUpdatedAt']).toEqual(undefined);
        expect(command.input.ReturnValuesOnConditionCheckFailure).toBe('ALL_OLD');
    });

    it('returns 409 when updatedAt is stale', async () => {
        const existing = makeGame({ updatedAt: '2025-06-18T00:00:00.000Z' });
        mockSend.mockRejectedValue(
            new ConditionalCheckFailedException({
                message: 'The conditional request failed',
                $metadata: {},
                Item: marshall(existing, { removeUndefinedValues: true }),
            }),
        );

        await expect(
            applyUpdate(
                'test-user',
                existing.cohort,
                existing.id,
                { updatedAt: '2025-06-19T00:00:00.000Z' },
                '2025-06-17T12:00:00.000Z',
            ),
        ).rejects.toMatchObject({
            statusCode: 409,
            publicMessage:
                'This game was modified in another tab or device. Please reload and try again.',
        });
    });

    it('returns 400 when game is missing or owner does not match', async () => {
        mockSend.mockRejectedValue(
            new ConditionalCheckFailedException({
                message: 'The conditional request failed',
                $metadata: {},
            }),
        );

        await expect(
            applyUpdate(
                'test-user',
                '1800-1900',
                'missing',
                { updatedAt: '2025-06-19T00:00:00.000Z' },
                '2025-06-17T12:00:00.000Z',
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            publicMessage:
                'Invalid request: game not found or you do not have permission to update it',
        });
    });

    it('returns 400 when owner does not match even if an item is returned', async () => {
        const existing = makeGame({ owner: 'other-user' });
        mockSend.mockRejectedValue(
            new ConditionalCheckFailedException({
                message: 'The conditional request failed',
                $metadata: {},
                Item: marshall(existing, { removeUndefinedValues: true }),
            }),
        );

        await expect(
            applyUpdate(
                'test-user',
                existing.cohort,
                existing.id,
                { updatedAt: '2025-06-19T00:00:00.000Z' },
                existing.updatedAt,
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            publicMessage:
                'Invalid request: game not found or you do not have permission to update it',
        });
    });
});
