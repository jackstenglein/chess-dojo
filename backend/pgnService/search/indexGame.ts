'use strict';

import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBRecord, DynamoDBStreamHandler } from 'aws-lambda';
import { Game } from '../game/types';
import { gamesIndex, getClient, isSearchEnabled } from './client';
import { buildSearchDocument, documentId } from './document';

/** An OpenSearch bulk response containing document-level failures. */
export class BulkIndexError extends Error {
    constructor(public readonly documentIds: string[]) {
        super(`Failed to index ${documentIds.length} games`);
        this.name = 'BulkIndexError';
    }
}

/**
 * Converts DynamoDB stream records for the games table into an OpenSearch
 * _bulk request body. Listed games are upserted; unlisted, system-owned and
 * removed games are deleted.
 */
export function recordsToBulkOperations(records: DynamoDBRecord[]): object[] {
    const operations: object[] = [];

    for (const record of records) {
        const newGame = record.dynamodb?.NewImage
            ? (unmarshall(record.dynamodb.NewImage as Record<string, AttributeValue>) as Game)
            : undefined;
        const oldGame = record.dynamodb?.OldImage
            ? (unmarshall(record.dynamodb.OldImage as Record<string, AttributeValue>) as Game)
            : undefined;

        const game = newGame || oldGame;
        if (!game) {
            continue;
        }

        const document = newGame ? buildSearchDocument(newGame) : undefined;
        if (document) {
            operations.push({
                index: { _index: gamesIndex(), _id: documentId(game) },
            });
            operations.push(document);
        } else {
            operations.push({
                delete: { _index: gamesIndex(), _id: documentId(game) },
            });
        }
    }

    return operations;
}

/** Returns the search document id for a stream record, if it has an image. */
function recordDocumentId(record: DynamoDBRecord): string | undefined {
    const image = record.dynamodb?.NewImage ?? record.dynamodb?.OldImage;
    if (!image) {
        return undefined;
    }
    return documentId(unmarshall(image as Record<string, AttributeValue>) as Game);
}

/**
 * Keeps the games search index in sync with the games table. Bulk-item
 * failures are reported individually (ReportBatchItemFailures) so the stream
 * retries only the failed records; retrying is safe because all operations
 * are idempotent upserts/deletes. A failed bulk request as a whole (e.g. the
 * domain is unreachable) throws, retrying the entire batch.
 */
export const handler: DynamoDBStreamHandler = async (event) => {
    if (!isSearchEnabled()) {
        // Simple deployments have no search domain.
        return { batchItemFailures: [] };
    }

    const operations = recordsToBulkOperations(event.Records);
    if (operations.length === 0) {
        return { batchItemFailures: [] };
    }

    const response = await getClient().bulk({ body: operations });

    const failedIds = new Set<string>();
    if (response.body.errors) {
        for (const item of response.body.items as Record<
            string,
            { _id?: string; error?: object; result?: string }
        >[]) {
            const result = item.index || item.delete;
            if (result?.error && result.result !== 'not_found' && result._id) {
                console.error('Bulk indexing failure: %j', item);
                failedIds.add(result._id);
            }
        }
    }

    if (failedIds.size === 0) {
        console.log(`Applied ${operations.length} bulk operations`);
        return { batchItemFailures: [] };
    }

    const batchItemFailures = event.Records.filter((record) => {
        const id = recordDocumentId(record);
        return id !== undefined && failedIds.has(id) && record.dynamodb?.SequenceNumber;
    }).map((record) => ({ itemIdentifier: record.dynamodb?.SequenceNumber ?? '' }));

    if (batchItemFailures.length === 0) {
        // Synthetic events without sequence numbers (the backfill) cannot use
        // partial-batch reporting. Include the failed document ids so the
        // backfill can report them, continue, and still finish nonzero.
        throw new BulkIndexError([...failedIds]);
    }

    console.error(`Failed to index ${batchItemFailures.length} games; reporting for retry`);
    return { batchItemFailures };
};
