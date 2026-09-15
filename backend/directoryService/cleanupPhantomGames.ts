/**
 * One-time cleanup script: removes directory references to games that no longer exist.
 *
 * Prior to the fix in delete.ts, deleting a game only removed it from the games
 * table but left stale references in user directories. Clicking these phantom
 * entries produces a 404. This script scans all directories, checks if each game
 * reference still exists, and removes any that don't.
 *
 * Usage:
 *   stage=prod npx ts-node cleanupPhantomGames.ts
 *
 * Safe to re-run — only removes references to games that no longer exist.
 */

import { AttributeValue, BatchGetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { directoryTable, dynamo, gameTable } from './database';
import { removeDirectoryItems } from './removeItems';

/**
 * Checks which games from a batch actually exist in the games table.
 * @param keys Array of { cohort, id } pairs (max 100 per call).
 * @returns Set of "cohort/id" strings that exist.
 */
async function checkGamesExist(keys: { cohort: string; id: string }[]): Promise<Set<string>> {
    const existing = new Set<string>();
    if (keys.length === 0) return existing;

    for (let i = 0; i < keys.length; i += 100) {
        let batch = keys.slice(i, i + 100).map((k) => marshall(k));

        while (batch.length > 0) {
            const output = await dynamo.send(
                new BatchGetItemCommand({
                    RequestItems: {
                        [gameTable]: {
                            Keys: batch,
                            ProjectionExpression: 'cohort, id',
                        },
                    },
                }),
            );

            for (const item of output.Responses?.[gameTable] ?? []) {
                const game = unmarshall(item) as { cohort: string; id: string };
                existing.add(`${game.cohort}/${game.id}`);
            }

            batch = output.UnprocessedKeys?.[gameTable]?.Keys ?? [];
        }
    }

    return existing;
}

async function main() {
    let scannedDirectories = 0;
    let phantomsRemoved = 0;
    let startKey: Record<string, AttributeValue> | undefined;

    do {
        console.log(
            `Scanning directories... (processed: ${scannedDirectories}, phantoms removed: ${phantomsRemoved})`,
        );

        const scanOutput = await dynamo.send(
            new ScanCommand({
                TableName: directoryTable,
                ExclusiveStartKey: startKey,
            }),
        );

        for (const rawDir of scanOutput.Items ?? []) {
            const dir = unmarshall(rawDir) as Directory;
            if (!dir.items) continue;

            // Collect game items from this directory
            const gameItems: { key: string; cohort: string; id: string }[] = [];
            for (const [itemKey, item] of Object.entries(dir.items)) {
                if (item.type !== DirectoryItemTypes.DIRECTORY) {
                    const tokens = itemKey.split('/');
                    if (tokens.length >= 2) {
                        gameItems.push({
                            key: itemKey,
                            cohort: tokens[0],
                            id: tokens.slice(1).join('/'),
                        });
                    }
                }
            }

            // Check which games still exist
            const existingGames = await checkGamesExist(
                gameItems.map((g) => ({ cohort: g.cohort, id: g.id })),
            );

            // Find phantoms — directory references to games that no longer exist
            const phantoms = gameItems.filter((g) => !existingGames.has(`${g.cohort}/${g.id}`));
            if (phantoms.length === 0) continue;

            console.log(
                `  Directory ${dir.owner}/${dir.id}: removing ${phantoms.length} phantom(s):${'\n'}    ${phantoms.map((p) => p.key).join('\n    ')}`,
            );

            try {
                await removeDirectoryItems(
                    dir.owner,
                    dir.id,
                    phantoms.map((p) => p.key),
                    undefined,
                    undefined,
                );
                phantomsRemoved += phantoms.length;
            } catch (err) {
                console.error(`  Failed to clean directory ${dir.owner}/${dir.id}:`, err);
            }

            scannedDirectories++;
        }

        startKey = scanOutput.LastEvaluatedKey;
    } while (startKey);

    console.log(
        `Done. Scanned ${scannedDirectories} directories with game items, removed ${phantomsRemoved} phantom references.`,
    );
}

main().catch(console.error);
