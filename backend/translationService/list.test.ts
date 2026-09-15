'use strict';

import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

vi.mock('./database', () => ({
    translationsTable: 'test-stage-translations',
    dynamo: { send: sendMock },
}));

import { handler } from './list';

function baseEvent(overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 {
    return {
        body: '{}',
        pathParameters: { locale: 'en', contentType: 'REQUIREMENT' },
        queryStringParameters: undefined,
        ...overrides,
    } as APIGatewayProxyEventV2;
}

describe('list handler', () => {
    beforeEach(() => {
        sendMock.mockReset();
    });

    it('returns 200 with unmarshalled translations and omits lastEvaluatedKey when absent', async () => {
        const row = { locale: 'en', contentKey: 'REQUIREMENT#r1', name: 'Translated' };
        sendMock.mockResolvedValueOnce({ Items: [marshall(row)] });

        const res = (await handler(
            baseEvent(),
            {} as any,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body || '{}');
        expect(body.translations).toEqual([row]);
        expect(body.lastEvaluatedKey).toBeUndefined();

        expect(sendMock).toHaveBeenCalledTimes(1);
        const cmd = sendMock.mock.calls[0][0] as QueryCommand;
        expect(cmd.input).toEqual({
            KeyConditionExpression: '#locale = :locale AND begins_with(#contentKey, :prefix)',
            ExpressionAttributeNames: {
                '#locale': 'locale',
                '#contentKey': 'contentKey',
            },
            ExpressionAttributeValues: {
                ':locale': { S: 'en' },
                ':prefix': { S: 'REQUIREMENT#' },
            },
            TableName: 'test-stage-translations',
        });
    });

    it('returns empty translations when DynamoDB returns no items', async () => {
        sendMock.mockResolvedValueOnce({});

        const res = (await handler(
            baseEvent(),
            {} as any,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body || '{}')).toEqual({ translations: [] });
    });

    it('passes Limit when limit query param is present', async () => {
        sendMock.mockResolvedValueOnce({});
        await handler(
            baseEvent({
                queryStringParameters: { limit: '25' },
            }),
            {} as any,
            () => {},
        );

        const cmd = sendMock.mock.calls[0][0] as QueryCommand;
        expect(cmd.input.Limit).toBe(25);
    });

    it('passes ExclusiveStartKey when startKey is valid JSON', async () => {
        sendMock.mockResolvedValueOnce({});
        const key = { locale: 'en', contentKey: 'REQUIREMENT#x' };
        await handler(
            baseEvent({
                queryStringParameters: { startKey: JSON.stringify(key) },
            }),
            {} as any,
            () => {},
        );

        const cmd = sendMock.mock.calls[0][0] as QueryCommand;
        expect(cmd.input.ExclusiveStartKey).toEqual(marshall(key));
    });

    it('returns 400 when startKey is not valid JSON', async () => {
        const res = (await handler(
            baseEvent({
                queryStringParameters: { startKey: 'not-json{' },
            }),
            {} as any,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body || '{}');
        expect(body.message).toBe('Invalid request: startKey is not valid');
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('returns lastEvaluatedKey as JSON string of unmarshalled key', async () => {
        const lek = marshall({ locale: 'en', contentKey: 'REQUIREMENT#z' });
        sendMock.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: lek });

        const res = (await handler(
            baseEvent(),
            {} as any,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body || '{}');
        expect(body.lastEvaluatedKey).toBe(
            JSON.stringify({ locale: 'en', contentKey: 'REQUIREMENT#z' }),
        );
    });

    it('returns 400 when request fails schema validation', async () => {
        const res = (await handler(
            baseEvent({
                pathParameters: { locale: 'invalid-locale', contentType: 'REQUIREMENT' },
            }),
            {} as any,
            () => {},
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(400);
        expect(sendMock).not.toHaveBeenCalled();
    });
});
