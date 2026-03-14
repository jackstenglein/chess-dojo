/**
 * Standalone script: reads tournaments.csv, groups rows by Tournament Name,
 * fetches each user from DynamoDB, builds a RoundRobin per tournament with
 * Berger pairings, then either prints them or saves to the
 * tournaments DynamoDB table (--persist).
 *
 * Usage (from repo root):
 *   stage=prod notificationEventSqsUrl=... npx tsx backend/roundRobinService/createChampionTournaments.ts [--persist]
 *
 * Or from backend/:
 *   stage=prod notificationEventSqsUrl=... npx tsx roundRobinService/createChampionTournaments.ts [--persist]
 */

import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    MAX_ROUND_ROBIN_PLAYERS,
    MIN_ROUND_ROBIN_PLAYERS,
    RoundRobin,
    RoundRobinPlayer,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';
import { sendRoundRobinStartEvent, setPairings } from './register';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const stage = process.env.stage || 'prod';
const usersTable = `${stage}-users`;
const tournamentsTable = `${stage}-tournaments`;

const TOURNAMENTS_CSV_PATH = path.join(__dirname, 'tournaments.csv');

interface TournamentRow {
    'Tournament Name': string;
    Username: string;
    'Display Name': string;
    'Normalized Rating'?: string;
    Email?: string;
}

function readCsv<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const rows: T[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row: T) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

async function fetchUser(username: string): Promise<User | null> {
    const result = await dynamo.send(
        new GetItemCommand({
            Key: { username: { S: username } },
            TableName: usersTable,
        }),
    );
    if (!result.Item) return null;
    return unmarshall(result.Item) as User;
}

async function main() {
    const dryRun = !process.argv.includes('--persist');
    if (dryRun) {
        console.log(
            'Dry run: will print each RoundRobin to console (no DB write). Disable with --persist.',
        );
    } else if (!process.env.notificationEventSqsUrl) {
        console.error('notificationEventSqsUrl environment variable is required for --persist.');
        process.exit(1);
    }

    if (!fs.existsSync(TOURNAMENTS_CSV_PATH)) {
        console.error(`Missing file: ${TOURNAMENTS_CSV_PATH}`);
        process.exit(1);
    }

    const rows = await readCsv<TournamentRow>(TOURNAMENTS_CSV_PATH);
    const byTournament = new Map<string, TournamentRow[]>();
    for (const row of rows) {
        const name = (row['Tournament Name'] || '').trim();
        if (!name) continue;
        if (!byTournament.has(name)) byTournament.set(name, []);
        byTournament.get(name)!.push(row);
    }

    for (const [tournamentName, tournamentRows] of byTournament) {
        const playerCount = tournamentRows.length;
        if (playerCount < MIN_ROUND_ROBIN_PLAYERS) {
            console.warn(
                `Skipping "${tournamentName}": only ${playerCount} players (min ${MIN_ROUND_ROBIN_PLAYERS}).`,
            );
            continue;
        }
        if (playerCount > MAX_ROUND_ROBIN_PLAYERS) {
            console.warn(
                `Skipping "${tournamentName}": it has ${playerCount} players (max ${MAX_ROUND_ROBIN_PLAYERS}).`,
            );
            continue;
        }

        const players: Record<string, RoundRobinPlayer> = {};
        for (const row of tournamentRows) {
            const username = (row.Username || '').trim();
            if (!username) continue;
            const user = await fetchUser(username);
            if (!user) {
                console.warn(`User not found, skipping: ${username} (${tournamentName})`);
                continue;
            }
            const displayName = user.displayName;
            players[username] = {
                username,
                displayName,
                lichessUsername: user.ratings?.LICHESS?.username ?? '',
                chesscomUsername: user.ratings?.CHESSCOM?.username ?? '',
                discordUsername: user.discordUsername ?? '',
                discordId: user.discordId ?? '',
                status: RoundRobinPlayerStatuses.ACTIVE,
            };
        }

        const numPlayers = Object.keys(players).length;
        if (numPlayers < MIN_ROUND_ROBIN_PLAYERS) {
            console.warn(`Skipping "${tournamentName}": only ${numPlayers} users found in DB.`);
            continue;
        }

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7 * (numPlayers + 1));

        const startsAt = `ACTIVE_${startDate.toISOString()}`;

        const tournament: RoundRobin = {
            type: `ROUND_ROBIN_CHAMPIONS`,
            startsAt,
            cohort: 'CHAMPIONS',
            name: `2025 Champions - ${tournamentName}`,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            players,
            playerOrder: [],
            pairings: [],
            updatedAt: new Date().toISOString(),
            reminderSent: false,
        };
        setPairings(tournament);

        if (dryRun) {
            console.log(JSON.stringify(tournament, null, 2));
            continue;
        }

        await dynamo.send(
            new PutItemCommand({
                Item: marshall(tournament, { removeUndefinedValues: true }),
                TableName: tournamentsTable,
            }),
        );
        console.log(`Saved RoundRobin: ${tournamentName} (${numPlayers} players).`);
        await sendRoundRobinStartEvent(tournament);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
