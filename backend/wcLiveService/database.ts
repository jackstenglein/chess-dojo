import {
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    QueryCommandInput,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { WcEval, WcGuesses } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { dynamo } from '../directoryService/database';

/**
 * One table for the live page:
 * - hash EVAL#<roundId>, range <ply, 3 digits>#<username>: one sensei eval of one position.
 * - hash GUESS#<roundId>, range <username>: a user's guesses for a game, one
 *   attribute per ply named g<ply>, so a guess is one SET without a read.
 */
export const WC_LIVE_TABLE = `${process.env.stage}-wc-live`;

const GUESS_PREFIX = 'g';

/** A 200 response without logging the body, which can be the whole leaderboard. */
export function ok(value: unknown): APIGatewayProxyResultV2 {
    return { statusCode: 200, body: JSON.stringify(value) };
}

async function queryAll(hash: string): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    const input: QueryCommandInput = {
        TableName: WC_LIVE_TABLE,
        KeyConditionExpression: '#hash = :hash',
        ExpressionAttributeNames: { '#hash': 'hash' },
        ExpressionAttributeValues: { ':hash': { S: hash } },
    };
    do {
        const output = await dynamo.send(new QueryCommand(input));
        items.push(...(output.Items ?? []).map((i) => unmarshall(i)));
        input.ExclusiveStartKey = output.LastEvaluatedKey;
    } while (input.ExclusiveStartKey);
    return items;
}

export async function putEval(roundId: string, e: WcEval): Promise<void> {
    await dynamo.send(
        new PutItemCommand({
            TableName: WC_LIVE_TABLE,
            Item: marshall({
                hash: `EVAL#${roundId}`,
                range: `${String(e.ply).padStart(3, '0')}#${e.username}`,
                ...e,
            }),
        }),
    );
}

export async function listEvals(roundId: string): Promise<WcEval[]> {
    const items = await queryAll(`EVAL#${roundId}`);
    return items.map((i) => ({
        username: i.username as string,
        displayName: i.displayName as string,
        ply: i.ply as number,
        value: i.value as number,
        updatedAt: i.updatedAt as string,
    }));
}

export async function putGuess(
    roundId: string,
    username: string,
    displayName: string,
    ply: number,
    uci: string,
): Promise<void> {
    await dynamo.send(
        new UpdateItemCommand({
            TableName: WC_LIVE_TABLE,
            Key: marshall({ hash: `GUESS#${roundId}`, range: username }),
            UpdateExpression: 'SET #username = :username, #displayName = :displayName, #ply = :uci',
            ExpressionAttributeNames: {
                '#username': 'username',
                '#displayName': 'displayName',
                '#ply': `${GUESS_PREFIX}${ply}`,
            },
            ExpressionAttributeValues: marshall({
                ':username': username,
                ':displayName': displayName,
                ':uci': uci,
            }),
        }),
    );
}

function toGuesses(item: Record<string, unknown>): WcGuesses {
    const guesses: Record<string, string> = {};
    for (const [key, value] of Object.entries(item)) {
        if (/^g\d+$/.test(key) && typeof value === 'string') {
            guesses[key.slice(GUESS_PREFIX.length)] = value;
        }
    }
    return {
        username: item.username as string,
        displayName: item.displayName as string,
        guesses,
    };
}

export async function getGuesses(roundId: string, username: string): Promise<WcGuesses> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: WC_LIVE_TABLE,
            Key: marshall({ hash: `GUESS#${roundId}`, range: username }),
        }),
    );
    if (!output.Item) {
        return { username, displayName: '', guesses: {} };
    }
    return toGuesses(unmarshall(output.Item));
}

export async function listGuesses(roundId: string): Promise<WcGuesses[]> {
    return (await queryAll(`GUESS#${roundId}`)).map(toGuesses);
}
