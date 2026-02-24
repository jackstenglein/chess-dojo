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
import {
    TimeManagementAggregate,
    updateTimeManagementAggregate,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { calculateTimeManagementRatings } from './timeManagement';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const stage = process.env.stage;
if (!stage) {
    console.error('ERROR: stage environment variable is required (e.g. stage=dev)');
    process.exit(1);
}
const gamesTable = `${stage}-games`;
const usersTable = `${stage}-users`;

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
    console.log(`Users table: ${usersTable}`);

    let gamesProcessed = 0;
    let gamesUpdated = 0;
    let gamesSkipped = 0;
    let gamesFailed = 0;

    // Accumulate per-owner aggregates in memory
    const userAggregates = new Map<string, TimeManagementAggregate>();

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

                // Skip games that already have TM ratings (idempotent)
                if (game.timeManagementRatingWhite !== undefined) {
                    gamesSkipped++;
                    // Still accumulate into user aggregate from existing ratings
                    accumulateUserAggregate(userAggregates, game);
                    continue;
                }

                if (!game.pgn) {
                    continue;
                }

                try {
                    const chess = new Chess({ pgn: game.pgn });
                    const tmRatings = calculateTimeManagementRatings(chess);

                    if (tmRatings.white === undefined && tmRatings.black === undefined) {
                        continue;
                    }

                    // Write per-game ratings
                    await updateGameRatings(game, tmRatings.white, tmRatings.black);
                    gamesUpdated++;

                    // Accumulate into user aggregate
                    game.timeManagementRatingWhite = tmRatings.white;
                    game.timeManagementRatingBlack = tmRatings.black;
                    accumulateUserAggregate(userAggregates, game);
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
        console.log(
            `  Progress: processed=${gamesProcessed} updated=${gamesUpdated} skipped=${gamesSkipped}`,
        );
        console.log(`  Last start key: ${JSON.stringify(startKey)}`);
        process.exit(1);
    }

    console.log('\n--- Game scan complete ---');
    console.log(`  Processed: ${gamesProcessed}`);
    console.log(`  Updated: ${gamesUpdated}`);
    console.log(`  Skipped (already had ratings): ${gamesSkipped}`);
    console.log(`  Failed: ${gamesFailed}`);
    console.log(`  Users with TM ratings: ${userAggregates.size}`);

    // Write user aggregates
    let usersUpdated = 0;
    let usersFailed = 0;

    for (const [owner, aggregate] of userAggregates) {
        try {
            await updateUserAggregate(owner, aggregate);
            usersUpdated++;
        } catch (err) {
            usersFailed++;
            if (usersFailed <= 10) {
                console.error(`  Failed to update user ${owner}:`, err);
            }
        }
    }

    console.log('\n--- User aggregates complete ---');
    console.log(`  Updated: ${usersUpdated}`);
    console.log(`  Failed: ${usersFailed}`);
    console.log('\nDone.');
}

/**
 * Accumulates a game's TM rating into the per-owner aggregate map.
 */
function accumulateUserAggregate(
    aggregates: Map<string, TimeManagementAggregate>,
    game: GameRecord,
): void {
    if (!game.owner) return;

    const ownerRating =
        game.orientation === 'black'
            ? game.timeManagementRatingBlack
            : game.timeManagementRatingWhite;

    if (ownerRating === undefined) return;

    const current = aggregates.get(game.owner);
    const updated = updateTimeManagementAggregate(current, ownerRating);
    aggregates.set(game.owner, updated);
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

/**
 * Writes the rebuilt TM aggregate to the user's top-level timeManagementRating field.
 */
async function updateUserAggregate(
    owner: string,
    aggregate: TimeManagementAggregate,
): Promise<void> {
    await dynamo.send(
        new UpdateItemCommand({
            Key: marshall({ username: owner }),
            TableName: usersTable,
            UpdateExpression: 'SET #tmr = :tmRating',
            ExpressionAttributeNames: {
                '#tmr': 'timeManagementRating',
            },
            ExpressionAttributeValues: marshall(
                {
                    ':tmRating': {
                        currentRating: aggregate.currentRating,
                        numGames: aggregate.numGames,
                    },
                },
                { removeUndefinedValues: true },
            ),
        }),
    );
}

main();
