import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBRecord } from 'aws-lambda';
import { BulkIndexError } from './indexGame';

/** One page of scanned game records plus the key of the next page, if any. */
export interface BackfillPage {
    records: DynamoDBRecord[];
    lastEvaluatedKey?: Record<string, AttributeValue>;
}

/** The outcome of a backfill run: games processed and documents that failed to index. */
export interface BackfillResult {
    processed: number;
    failedDocumentIds: string[];
}

interface RunBackfillOptions {
    cohorts: string[];
    scanPage: (cohort: string, startKey?: Record<string, AttributeValue>) => Promise<BackfillPage>;
    indexRecords: (records: DynamoDBRecord[]) => Promise<unknown>;
    sleep?: () => Promise<void>;
    onProgress?: (processed: number) => void;
}

/**
 * Scans and indexes every backfill page. Document-level mapping failures are
 * collected so later pages can continue; infrastructure failures still abort.
 */
export async function runBackfill({
    cohorts,
    scanPage,
    indexRecords,
    sleep = () => Promise.resolve(),
    onProgress = () => undefined,
}: RunBackfillOptions): Promise<BackfillResult> {
    let processed = 0;
    const failedDocumentIds = new Set<string>();

    for (const cohort of cohorts) {
        let startKey: Record<string, AttributeValue> | undefined;
        do {
            const page = await scanPage(cohort, startKey);
            try {
                await indexRecords(page.records);
            } catch (err) {
                if (!(err instanceof BulkIndexError)) {
                    throw err;
                }
                for (const id of err.documentIds) {
                    failedDocumentIds.add(id);
                }
                console.error('Skipping failed backfill documents: %j', err.documentIds);
            }

            processed += page.records.length;
            onProgress(processed);
            startKey = page.lastEvaluatedKey;
            if (startKey) {
                await sleep();
            }
        } while (startKey);
    }

    return { processed, failedDocumentIds: [...failedDocumentIds] };
}
