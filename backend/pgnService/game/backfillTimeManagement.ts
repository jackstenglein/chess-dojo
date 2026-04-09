/**
 * Backfill script for time management ratings.
 *
 * Scans all games in the database, calculates per-game TM ratings for games
 * with clock annotations, writes them to the game records, and rebuilds
 * user-level aggregates.
 *
 * Usage:
 *   stage=dev npx tsx pgnService/game/backfillTimeManagement.ts
 *   stage=prod npx tsx pgnService/game/backfillTimeManagement.ts
 *
 * Idempotent: skips games that already have timeManagementRatingWhite set.
 * User aggregates are rebuilt from scratch on every run.
 */

import {
    AttributeValue,
    DynamoDBClient,
    ScanCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import { rateGameTimeManagement, rebuildUserTimeManagementRating } from './timeManagement';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const stage = process.env.stage;
if (!stage) {
    console.error('ERROR: stage environment variable is required (e.g. stage=dev)');
    process.exit(1);
}
const gamesTable = `${stage}-games`;

interface GameRecord {
    cohort: string;
    id: string;
    owner: string;
    orientation?: string;
    pgn?: string;
    timeManagementRatingWhite?: number;
    timeManagementRatingBlack?: number;
}

async function main() {
    console.log(`Backfilling time management ratings on stage: ${stage}`);
    console.log(`Games table: ${gamesTable}`);
    console.log(`Users table: ${stage}-users`);

    // Phase 1: Scan all games and write per-game TM ratings
    let gamesProcessed = 0;
    let gamesUpdated = 0;
    let gamesSkipped = 0;
    let gamesFailed = 0;
    const owners = new Set<string>();

    let startKey: Record<string, AttributeValue> | undefined = undefined;

    try {
        do {
            console.log(
                `\nScan page | processed: ${gamesProcessed} | updated: ${gamesUpdated} | skipped: ${gamesSkipped}`,
            );

            const scanOutput = await dynamo.send(
                new ScanCommand({
                    ExclusiveStartKey: startKey,
                    TableName: gamesTable,
                }),
            );

            const items = scanOutput.Items ?? [];
            console.log(`  Received ${items.length} items`);

            for (const item of items) {
                gamesProcessed++;
                const game = unmarshall(item) as GameRecord;

                if (game.owner) {
                    owners.add(game.owner);
                }

                // Skip games that already have TM ratings (idempotent)
                if (game.timeManagementRatingWhite !== undefined) {
                    gamesSkipped++;
                    continue;
                }

                if (!game.pgn) {
                    continue;
                }

                try {
                    const chess = new Chess({ pgn: game.pgn });
                    const tmRatings = rateGameTimeManagement(chess);

                    if (tmRatings.white === undefined && tmRatings.black === undefined) {
                        continue;
                    }

                    await updateGameRatings(game, tmRatings.white, tmRatings.black);
                    gamesUpdated++;
                } catch (err) {
                    gamesFailed++;
                    if (gamesFailed <= 10) {
                        console.error(`  Failed to process game ${game.cohort}/${game.id}:`, err);
                    }
                }
            }

            startKey = scanOutput.LastEvaluatedKey;
        } while (startKey);
    } catch (err) {
        console.error('Fatal error during scan:', err);
        process.exit(1);
    }

    console.log('\n--- Game scan complete ---');
    console.log(`  Processed: ${gamesProcessed}`);
    console.log(`  Updated: ${gamesUpdated}`);
    console.log(`  Skipped (already had ratings): ${gamesSkipped}`);
    console.log(`  Failed: ${gamesFailed}`);

    // Phase 2: Rebuild user TM ratings from mygames directories
    console.log(`\nRebuilding TM ratings for ${owners.size} users (scoped to mygames)...`);
    let usersUpdated = 0;
    let usersFailed = 0;

    for (const owner of owners) {
        try {
            await rebuildUserTimeManagementRating(owner);
            usersUpdated++;
        } catch (err) {
            usersFailed++;
            if (usersFailed <= 10) {
                console.error(`  Failed to rebuild TM rating for ${owner}:`, err);
            }
        }
    }

    console.log('\n--- User ratings complete ---');
    console.log(`  Updated: ${usersUpdated}`);
    console.log(`  Failed: ${usersFailed}`);
    console.log('\nDone.');
}

/**
 * Writes per-game TM ratings to the game record.
 */
async function updateGameRatings(game: GameRecord, white?: number, black?: number): Promise<void> {
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const setClauses: string[] = [];

    if (white !== undefined) {
        names['#tmw'] = 'timeManagementRatingWhite';
        values[':tmw'] = white;
        setClauses.push('#tmw = :tmw');
    }
    if (black !== undefined) {
        names['#tmb'] = 'timeManagementRatingBlack';
        values[':tmb'] = black;
        setClauses.push('#tmb = :tmb');
    }

    if (setClauses.length === 0) return;

    await dynamo.send(
        new UpdateItemCommand({
            Key: marshall({ cohort: game.cohort, id: game.id }),
            TableName: gamesTable,
            UpdateExpression: `SET ${setClauses.join(', ')}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: marshall(values),
        }),
    );
}


main();
