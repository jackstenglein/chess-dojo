// One-off backfill of the games search index. Scans the games table and
// feeds the items through the same handler as the DynamoDB stream, so it
// is idempotent and safe to re-run.
//
// Usage (requires AWS credentials for the target stage):
//   stage=dev gameSearchEndpoint=https://<domain-endpoint> npx tsx pgnService/search/backfill.ts

import {
    AttributeValue,
    DynamoDBClient,
    ScanCommand,
    ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { runBackfill } from './backfillRunner';
import { gamesIndex, getClient } from './client';
import { handler } from './indexGame';
import { createGamesIndex } from './mapping';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const gamesTable = process.env.stage + '-games';

async function main() {
    await createGamesIndex(getClient(), gamesIndex());

    let processed = 0;

    try {
        const result = await runBackfill({
            scanPage: async (startKey?: Record<string, AttributeValue>) => {
                const scanOutput: ScanCommandOutput = await dynamo.send(
                    new ScanCommand({
                        ExclusiveStartKey: startKey,
                        TableName: gamesTable,
                        Limit: 250,
                    }),
                );

                const records = scanOutput.Items?.map((item) => ({
                    dynamodb: { NewImage: item },
                })) as DynamoDBRecord[] | undefined;
                return {
                    records: records ?? [],
                    lastEvaluatedKey: scanOutput.LastEvaluatedKey,
                };
            },
            indexRecords: async (records) => {
                await handler(
                    { Records: records } as DynamoDBStreamEvent,
                    undefined as unknown as Context,
                    () => null,
                );
            },
            onProgress: (count) => {
                processed = count;
                console.log('Processed: ', processed);
            },
            // Throttle: the shared single-node domain also serves prod queries.
            sleep: () => new Promise((resolve) => setTimeout(resolve, 250)),
        });

        const count = await getClient().count({ index: gamesIndex() });
        const summary = `Processed ${result.processed} games; ${gamesIndex()} now has ${count.body.count} documents.`;
        if (result.failedDocumentIds.length > 0) {
            console.error(
                `BACKFILL INCOMPLETE. ${summary} Failed document ids: %j`,
                result.failedDocumentIds,
            );
            process.exitCode = 1;
        } else {
            console.log(`Done. ${summary}`);
        }
    } catch (err) {
        console.error('BACKFILL FAILED after processing', processed, 'games:', err);
        process.exitCode = 1;
    }
}

void main();
