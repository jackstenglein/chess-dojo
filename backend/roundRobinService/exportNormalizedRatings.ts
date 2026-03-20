/**
 * Standalone script: reads form_responses.csv, matches each line to round_robin_winners.csv
 * by Display Name, fetches each user from DynamoDB, computes normalized rating via
 * common ratings, and writes username + normalized rating to a new CSV.
 *
 * Run from repo root with AWS credentials and stage set, e.g.:
 *   cd backend && stage=prod npx tsx roundRobinService/exportNormalizedRatings.ts
 * Or with explicit paths:
 *   stage=prod npx tsx backend/roundRobinService/exportNormalizedRatings.ts
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/ratingSystem';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { getNormalizedRating } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import csvParser from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const usersTable = `${process.env.stage || 'dev'}-users`;

const FORM_RESPONSES_PATH = path.join(__dirname, 'form_responses.csv');
const ROUND_ROBIN_WINNERS_PATH = path.join(__dirname, 'round_robin_winners.csv');
const OUTPUT_PATH = path.join(__dirname, 'normalized_ratings.csv');

interface FormResponseRow {
    'Display Name': string;
    'Email Address'?: string;
    'Current Cohort'?: string;
    [key: string]: string | undefined;
}

interface WinnerRow {
    'Display Name': string;
    Username: string;
    [key: string]: string | undefined;
}

function normalizeDisplayName(name: string): string {
    return name.trim().toLowerCase();
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

function escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

async function main() {
    if (!process.env.stage) {
        console.warn('stage not set, defaulting to dev. Set stage=prod (or dev) if needed.');
    }

    const formRows = await readCsv<FormResponseRow>(FORM_RESPONSES_PATH);
    const winnerRows = await readCsv<WinnerRow>(ROUND_ROBIN_WINNERS_PATH);

    const displayNameToUsername = new Map<string, string>();
    for (const row of winnerRows) {
        const key = normalizeDisplayName(row['Display Name']);
        if (!displayNameToUsername.has(key)) {
            displayNameToUsername.set(key, row.Username);
        } else if (displayNameToUsername.get(key) !== row.Username) {
            console.warn(
                `Duplicate display name: ${key} (${row.Username}). First occurrence username: ${displayNameToUsername.get(key)}`,
            );
            throw new Error('Duplicate display name');
        }
    }

    const outputRows: string[][] = [['Username', 'Display Name', 'Normalized Rating', 'Email']];

    for (const formRow of formRows) {
        const displayName = (formRow['Display Name'] || '').trim();
        if (!displayName) continue;

        const username = displayNameToUsername.get(normalizeDisplayName(displayName));
        if (!username) {
            console.warn(`No round-robin winner match for display name: ${displayName}`);
            continue;
        }

        const user = await fetchUser(username);
        if (!user) {
            console.warn(`User not found: ${displayName} (${username})`);
            continue;
        }

        const ratingData = user.ratings?.[user.ratingSystem as RatingSystem];
        const currentRating = ratingData?.currentRating;
        if (!currentRating) {
            console.warn(
                `No rating for user ${displayName} (${username}) on rating system ${user.ratingSystem}`,
            );
            continue;
        }

        const normalizedRating = getNormalizedRating(
            currentRating,
            user.ratingSystem as RatingSystem,
        );
        const email = formRow['Email Address'] ?? '';
        outputRows.push(
            [username, displayName, String(normalizedRating), email].map(escapeCsvField),
        );
    }

    const csvContent = outputRows.map((row) => row.join(',')).join('\n') + '\n';
    fs.writeFileSync(OUTPUT_PATH, csvContent, 'utf8');
    console.log(`Wrote ${outputRows.length - 1} rows to ${OUTPUT_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
