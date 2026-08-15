import { marshall } from '@aws-sdk/util-dynamodb';
import { Client } from '@opensearch-project/opensearch';
import { Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BulkIndexError, handler, recordsToBulkOperations } from './indexGame';
import { ensureGamesIndex, resetGamesIndexEnsureCache } from './mapping';

process.env.stage = 'test';

function record(
    eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
    newImage?: object,
    oldImage?: object,
    sequenceNumber?: string,
): DynamoDBRecord {
    return {
        eventName,
        dynamodb: {
            NewImage: newImage ? (marshall(newImage) as never) : undefined,
            OldImage: oldImage ? (marshall(oldImage) as never) : undefined,
            SequenceNumber: sequenceNumber,
        },
    } as DynamoDBRecord;
}

const game = {
    cohort: '1500-1600',
    id: 'g1',
    white: 'daniel naroditsky',
    black: 'magnus carlsen',
    date: '2026.06.15',
    createdAt: '2026-07-01T12:00:00Z',
    owner: 'user-1',
    ownerDisplayName: 'Kerv',
    headers: { White: 'Daniel Naroditsky', Black: 'Magnus Carlsen' },
    unlisted: false,
};

describe('recordsToBulkOperations', () => {
    it('indexes new listed games', () => {
        const ops = recordsToBulkOperations([record('INSERT', game)]);
        expect(ops[0]).toEqual({
            index: { _index: 'test-games', _id: '1500-1600#g1' },
        });
        expect(ops[1]).toMatchObject({ white: 'Daniel Naroditsky' });
        expect(ops).toHaveLength(2);
    });

    it('deletes games that become unlisted', () => {
        const ops = recordsToBulkOperations([record('MODIFY', { ...game, unlisted: true }, game)]);
        expect(ops).toEqual([{ delete: { _index: 'test-games', _id: '1500-1600#g1' } }]);
    });

    it('deletes removed games', () => {
        const ops = recordsToBulkOperations([record('REMOVE', undefined, game)]);
        expect(ops).toEqual([{ delete: { _index: 'test-games', _id: '1500-1600#g1' } }]);
    });

    it('skips records with no images', () => {
        expect(recordsToBulkOperations([record('MODIFY')])).toEqual([]);
    });
});

describe('handler', () => {
    it('no-ops when search is not configured', async () => {
        process.env.gameSearchEndpoint = 'unset';
        await expect(
            handler(
                { Records: [record('INSERT', game)] } as DynamoDBStreamEvent,
                undefined as unknown as Context,
                () => null,
            ),
        ).resolves.toEqual({ batchItemFailures: [] });
    });
});

const runIntegration = process.env.OPENSEARCH_INTEGRATION === 'true';

describe.runIf(runIntegration)('indexGame handler (integration)', () => {
    const client = new Client({ node: 'http://localhost:9200' });

    beforeAll(async () => {
        process.env.gameSearchEndpoint = 'http://localhost:9200';
        resetGamesIndexEnsureCache();
        await ensureGamesIndex(client, 'test-games');
    });

    afterAll(async () => {
        await client.indices.delete({ index: 'test-games' });
        resetGamesIndexEnsureCache();
    });

    async function invoke(records: DynamoDBRecord[]) {
        await handler(
            { Records: records } as DynamoDBStreamEvent,
            undefined as unknown as Context,
            () => null,
        );
        await client.indices.refresh({ index: 'test-games' });
    }

    it('indexes, then removes on unlist', async () => {
        await invoke([record('INSERT', game)]);
        let res = await client.search({
            index: 'test-games',
            body: { query: { match: { white: 'naroditsky' } } },
        });
        expect(res.body.hits.hits).toHaveLength(1);

        await invoke([record('MODIFY', { ...game, unlisted: true }, game)]);
        res = await client.search({
            index: 'test-games',
            body: { query: { match: { white: 'naroditsky' } } },
        });
        expect(res.body.hits.hits).toHaveLength(0);
    });

    // WhiteElo far beyond integer range fails the bulk item at mapping time.
    const poison = {
        ...game,
        id: 'poison',
        headers: { ...game.headers, WhiteElo: '99999999999999' },
    };

    it('reports only the failed records for partial bulk failures', async () => {
        const result = await handler(
            {
                Records: [
                    record('INSERT', game, undefined, 'seq-good'),
                    record('INSERT', poison, undefined, 'seq-poison'),
                ],
            } as DynamoDBStreamEvent,
            undefined as unknown as Context,
            () => null,
        );
        expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'seq-poison' }] });

        await client.indices.refresh({ index: 'test-games' });
        const res = await client.search({
            index: 'test-games',
            body: { query: { term: { id: 'g1' } } },
        });
        expect(res.body.hits.hits).toHaveLength(1);
    });

    it('throws when failed records have no sequence number (backfill events)', async () => {
        await expect(
            handler(
                { Records: [record('INSERT', poison)] } as DynamoDBStreamEvent,
                undefined as unknown as Context,
                () => null,
            ),
        ).rejects.toEqual(new BulkIndexError(['1500-1600#poison']));
    });
});
