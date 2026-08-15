import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { runBackfill } from './backfillRunner';
import { BulkIndexError } from './indexGame';

const record = (id: string) => ({ eventID: id }) as DynamoDBRecord;

describe('runBackfill', () => {
    it('continues after document failures and returns every failed document id', async () => {
        const nextKey = { cohort: { S: 'next' } } as Record<string, AttributeValue>;
        const scanPage = vi
            .fn()
            .mockResolvedValueOnce({ records: [record('first')], lastEvaluatedKey: nextKey })
            .mockResolvedValueOnce({ records: [record('second')] });
        const indexRecords = vi
            .fn()
            .mockRejectedValueOnce(new BulkIndexError(['1500-1600#poison']))
            .mockResolvedValueOnce(undefined);
        const sleep = vi.fn().mockResolvedValue(undefined);
        const onProgress = vi.fn();

        const result = await runBackfill({
            cohorts: ['1500-1600'],
            scanPage,
            indexRecords,
            sleep,
            onProgress,
        });

        expect(result).toEqual({
            processed: 2,
            failedDocumentIds: ['1500-1600#poison'],
        });
        expect(scanPage).toHaveBeenNthCalledWith(1, '1500-1600', undefined);
        expect(scanPage).toHaveBeenNthCalledWith(2, '1500-1600', nextKey);
        expect(indexRecords).toHaveBeenCalledTimes(2);
        expect(sleep).toHaveBeenCalledTimes(1);
        expect(onProgress).toHaveBeenNthCalledWith(1, 1);
        expect(onProgress).toHaveBeenNthCalledWith(2, 2);
    });

    it('stops on infrastructure failures instead of misclassifying them as bad documents', async () => {
        const scanPage = vi.fn().mockResolvedValue({ records: [record('first')] });
        const indexRecords = vi.fn().mockRejectedValue(new Error('OpenSearch unavailable'));

        await expect(
            runBackfill({ cohorts: ['1500-1600'], scanPage, indexRecords }),
        ).rejects.toThrow('OpenSearch unavailable');
    });
});
