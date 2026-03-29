/**
 * One-time backfill script: populates the `date` field in directory game item metadata.
 *
 * Games added to directories before this field was introduced will have no `date`
 * in their metadata. This script scans the directory table, identifies game items
 * with missing dates, fetches the play date from the games table, and writes it back.
 *
 * Usage:
 *   stage=prod npx ts-node backfillGameDates.ts
 *
 * The script is read-friendly (paginated scan with delays) and write-friendly
 * (PartiQL batch statements, 25 at a time). Safe to re-run — skips items that
 * already have a date.
 */

import {
    AttributeValue,
    BatchExecuteStatementCommand,
    BatchGetItemCommand,
    BatchStatementRequest,
    ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    DirectoryItem,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { directoryTable, dynamo, gameTable } from './database';

/** Delay between scan pages to reduce DynamoDB pressure. */
const SCAN_DELAY_MS = 200;

/** Pause execution for the given number of milliseconds. */
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches the Date header for a batch of games from the games table.
 * @param keys Array of { cohort, id } pairs (max 100 per call).
 * @returns Map from "cohort/id" to date string.
 */
async function fetchGameDates(
    keys: { cohort: string; id: string }[],
): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    if (keys.length === 0) return result;

    for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100);
        const output = await dynamo.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [gameTable]: {
                        Keys: batch.map((k) => marshall({ cohort: k.cohort, id: k.id })),
                        ProjectionExpression: 'cohort, id, headers.#d',
                        ExpressionAttributeNames: { '#d': 'Date' },
                    },
                },
            }),
        );

        for (const item of output.Responses?.[gameTable] ?? []) {
            const game = unmarshall(item) as {
                cohort: string;
                id: string;
                headers?: { Date?: string };
            };
            const date = game.headers?.Date;
            if (date) {
                result[`${game.cohort}/${game.id}`] = date;
            }
        }
    }

    return result;
}

async function main() {
    let scannedDirectories = 0;
    let updatedItems = 0;
    let startKey: Record<string, AttributeValue> | undefined;

    do {
        console.log(`Scanning directories... (processed: ${scannedDirectories}, updated items: ${updatedItems})`);

        const scanOutput = await dynamo.send(
            new ScanCommand({
                TableName: directoryTable,
                ExclusiveStartKey: startKey,
            }),
        );

        for (const rawDir of scanOutput.Items ?? []) {
            const dir = unmarshall(rawDir) as {
                owner: string;
                id: string;
                items?: Record<string, DirectoryItem>;
            };

            if (!dir.items) continue;

            // Collect game items that are missing the date field
            const needsDate: { key: string; cohort: string; id: string }[] = [];
            for (const [itemKey, item] of Object.entries(dir.items)) {
                if (
                    item.type !== DirectoryItemTypes.DIRECTORY &&
                    !item.metadata.date
                ) {
                    const tokens = itemKey.split('/');
                    if (tokens.length >= 2) {
                        needsDate.push({ key: itemKey, cohort: tokens[0], id: tokens.slice(1).join('/') });
                    }
                }
            }

            if (needsDate.length === 0) continue;

            // Fetch dates from the games table
            const dateMap = await fetchGameDates(
                needsDate.map((n) => ({ cohort: n.cohort, id: n.id })),
            );

            // Build PartiQL update statements for items that have a date
            const statements: BatchStatementRequest[] = [];
            for (const item of needsDate) {
                const date = dateMap[`${item.cohort}/${item.id}`];
                if (!date) continue;

                statements.push({
                    Statement: `UPDATE "${directoryTable}" SET items."${item.key}".metadata.date=? WHERE owner=? AND id=?`,
                    Parameters: marshall([date, dir.owner, dir.id]) as unknown as AttributeValue[],
                });
            }

            // Execute in batches of 25 (DynamoDB PartiQL limit)
            for (let i = 0; i < statements.length; i += 25) {
                const batch = statements.slice(i, i + 25);
                await dynamo.send(new BatchExecuteStatementCommand({ Statements: batch }));
                updatedItems += batch.length;
            }

            scannedDirectories++;
        }

        startKey = scanOutput.LastEvaluatedKey;
        if (startKey) {
            await sleep(SCAN_DELAY_MS);
        }
    } while (startKey);

    console.log(`Done. Scanned ${scannedDirectories} directories, updated ${updatedItems} game items.`);
}

main().catch(console.error);
