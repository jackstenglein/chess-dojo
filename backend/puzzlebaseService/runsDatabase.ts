'use strict';

import {
    ConditionalCheckFailedException,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    addCounters,
    continuesSession,
    countersForAttempt,
    emptyCounters,
    PuzzleAttempt,
    PuzzleSession,
    PuzzleStatsResponse,
    StatCounters,
    statKeys,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import type { MemberRating } from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { ApiError } from '../directoryService/api';
import { dynamo, getUser } from './database';

/**
 * The name of the DynamoDB table with everything about how people solve puzzles. Every item is
 * under the solver's username, and the sort key says what it is:
 *
 * - `ATTEMPT#<finishedAt>#<puzzleId>`: one puzzle solved (or left), with every move tried.
 * - `SESSION#<startedAt>`: a stretch of solving with breaks under 30 minutes, with its totals.
 * - `STATS#TOTAL`, `STATS#BUCKET#<bucket>`, `STATS#THEME#<theme>`: running totals.
 * - `RATING`: the person's tactics rating, its uncertainty and how many puzzles counted towards it.
 *
 * Attempts and sessions sort by time, so a day or a month is a range query.
 */
export const runsTable = process.env.stage + '-puzzlebase-runs';

const COUNTER_FIELDS = Object.keys(emptyCounters()) as (keyof StatCounters)[];

/** Builds the `ADD` part of an update that adds a set of counters to the stored totals. */
function addCountersExpression(counters: StatCounters) {
    return {
        expression: 'ADD ' + COUNTER_FIELDS.map((f) => `#${f} :${f}`).join(', '),
        names: Object.fromEntries(COUNTER_FIELDS.map((f) => [`#${f}`, f])),
        values: Object.fromEntries(COUNTER_FIELDS.map((f) => [`:${f}`, counters[f]])),
    };
}

/** Requires the caller to be allowed to see a person's stats: themselves, a coach, or an admin. */
export async function requireCanViewStats(caller: string, target: string) {
    if (caller === target) {
        return;
    }
    const user = await getUser(caller);
    if (!user.isAdmin && !user.isCoach) {
        throw new ApiError({
            statusCode: 403,
            publicMessage: "You can only see your own puzzle stats, unless you're a coach or admin",
        });
    }
}

/**
 * Saves an attempt. The attempt is identified by when it finished and which puzzle it was, so
 * sending the same attempt twice (a retry, say) saves it once.
 * @returns False if it was already saved.
 */
export async function putAttempt(username: string, attempt: PuzzleAttempt): Promise<boolean> {
    try {
        await dynamo.send(
            new PutItemCommand({
                TableName: runsTable,
                Item: marshall(
                    {
                        username,
                        sk: `ATTEMPT#${attempt.finishedAt}#${attempt.puzzleId}`,
                        ...attempt,
                    },
                    { removeUndefinedValues: true },
                ),
                ConditionExpression: 'attribute_not_exists(sk)',
            }),
        );
        return true;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return false;
        }
        throw err;
    }
}

/** Returns one saved attempt, if there is one. */
export async function getAttempt(
    username: string,
    finishedAt: string,
    puzzleId: string,
): Promise<PuzzleAttempt | undefined> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: runsTable,
            Key: marshall({ username, sk: `ATTEMPT#${finishedAt}#${puzzleId}` }),
        }),
    );
    if (!output.Item) return undefined;
    const { username: _username, sk: _sk, ...attempt } = unmarshall(output.Item);
    return attempt as PuzzleAttempt;
}

/** Returns the person's tactics rating, or undefined if no puzzle has counted towards one yet. */
export async function getMemberRating(username: string): Promise<MemberRating | undefined> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: runsTable,
            Key: marshall({ username, sk: 'RATING' }),
        }),
    );
    if (!output.Item) return undefined;
    const item = unmarshall(output.Item);
    return { rating: item.rating, rd: item.rd, count: item.count };
}

/**
 * Saves the person's tactics rating. It only succeeds if the rating has not changed since it was
 * read, so two puzzles finished at once cannot overwrite each other.
 * @param previousCount How many puzzles counted when the rating was read, or undefined if there was none.
 * @returns False if the rating changed in the meantime.
 */
export async function putMemberRating(
    username: string,
    rating: MemberRating,
    previousCount: number | undefined,
): Promise<boolean> {
    try {
        await dynamo.send(
            new PutItemCommand({
                TableName: runsTable,
                Item: marshall({
                    username,
                    sk: 'RATING',
                    ...rating,
                    updatedAt: new Date().toISOString(),
                }),
                ConditionExpression:
                    previousCount === undefined ? 'attribute_not_exists(sk)' : '#count = :previous',
                ExpressionAttributeNames:
                    previousCount === undefined ? undefined : { '#count': 'count' },
                ExpressionAttributeValues:
                    previousCount === undefined
                        ? undefined
                        : marshall({ ':previous': previousCount }),
            }),
        );
        return true;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return false;
        }
        throw err;
    }
}

/** Returns the person's latest session, if they have one. */
async function latestSession(username: string): Promise<PuzzleSession | undefined> {
    const output = await dynamo.send(
        new QueryCommand({
            TableName: runsTable,
            KeyConditionExpression: 'username = :username AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: marshall({ ':username': username, ':prefix': 'SESSION#' }),
            ScanIndexForward: false,
            Limit: 1,
        }),
    );
    const item = output.Items?.[0];
    return item ? toSession(unmarshall(item)) : undefined;
}

function toSession(item: Record<string, any>): PuzzleSession {
    const { username: _username, sk: _sk, ...session } = item;
    return session as PuzzleSession;
}

/**
 * Adds an attempt to the person's session: their latest one if it finished less than 30 minutes
 * ago, otherwise a new one that starts with this attempt.
 */
export async function addToSession(username: string, attempt: PuzzleAttempt) {
    const latest = await latestSession(username);
    const continuing =
        latest !== undefined && continuesSession(latest.lastActiveAt, attempt.finishedAt);
    const startedAt = continuing ? latest.startedAt : attempt.startedAt;
    const lastActiveAt =
        continuing && latest.lastActiveAt > attempt.finishedAt
            ? latest.lastActiveAt
            : attempt.finishedAt;

    const add = addCountersExpression(countersForAttempt(attempt.summary));
    await dynamo.send(
        new UpdateItemCommand({
            TableName: runsTable,
            Key: marshall({ username, sk: `SESSION#${startedAt}` }),
            UpdateExpression: `SET startedAt = :startedAt, lastActiveAt = :lastActiveAt ${add.expression}`,
            ExpressionAttributeNames: add.names,
            ExpressionAttributeValues: marshall({
                ':startedAt': startedAt,
                ':lastActiveAt': lastActiveAt,
                ...add.values,
            }),
        }),
    );
}

/** Adds an attempt to the person's running totals: overall, and for each bucket and theme. */
export async function addToStats(username: string, attempt: PuzzleAttempt) {
    const add = addCountersExpression(countersForAttempt(attempt.summary));
    await Promise.all(
        statKeys(attempt).map((key) =>
            dynamo.send(
                new UpdateItemCommand({
                    TableName: runsTable,
                    Key: marshall({ username, sk: `STATS#${key}` }),
                    UpdateExpression: add.expression,
                    ExpressionAttributeNames: add.names,
                    ExpressionAttributeValues: marshall(add.values),
                }),
            ),
        ),
    );
}

/** Returns every item of the person with a sort key in the given range, following pagination. */
async function queryRange(
    username: string,
    from: string,
    to: string,
    limit = 1000,
    projection?: string,
) {
    const items: Record<string, any>[] = [];
    let startKey: Record<string, any> | undefined;
    do {
        const output = await dynamo.send(
            new QueryCommand({
                TableName: runsTable,
                KeyConditionExpression: 'username = :username AND sk BETWEEN :from AND :to',
                ExpressionAttributeValues: marshall({
                    ':username': username,
                    ':from': from,
                    ':to': to,
                }),
                ...(projection ? { ProjectionExpression: projection } : {}),
                ExclusiveStartKey: startKey,
            }),
        );
        items.push(...(output.Items ?? []).map((item) => unmarshall(item)));
        startKey = output.LastEvaluatedKey;
    } while (startKey && items.length < limit);
    return items;
}

/** Returns a person's running totals: overall, and by bucket and theme. */
export async function getStats(username: string): Promise<PuzzleStatsResponse> {
    const stats: PuzzleStatsResponse = { total: emptyCounters(), buckets: {}, themes: {} };
    const rating = await getMemberRating(username);
    if (rating) stats.rating = rating;
    for (const item of await queryRange(username, 'STATS#', 'STATS#~')) {
        const counters = addCounters(
            emptyCounters(),
            Object.fromEntries(
                COUNTER_FIELDS.map((f) => [f, item[f] ?? 0]),
            ) as unknown as StatCounters,
        );
        const key = String(item.sk).slice('STATS#'.length);
        if (key === 'TOTAL') {
            stats.total = counters;
        } else if (key.startsWith('BUCKET#')) {
            stats.buckets[key.slice('BUCKET#'.length)] = counters;
        } else if (key.startsWith('THEME#')) {
            stats.themes[key.slice('THEME#'.length)] = counters;
        }
    }
    return stats;
}

/**
 * Returns a person's sessions and attempts between two times. The end sorts after everything that
 * happens at that time, because attempt keys carry the puzzle id after the time.
 */
export async function getRuns(username: string, from: string, to: string) {
    const [sessions, attempts] = await Promise.all([
        queryRange(username, `SESSION#${from}`, `SESSION#${to}~`),
        queryRange(username, `ATTEMPT#${from}`, `ATTEMPT#${to}~`),
    ]);
    return {
        sessions: sessions.map(toSession),
        attempts: attempts.map((item) => {
            const { username: _username, sk: _sk, ...attempt } = item;
            return attempt as PuzzleAttempt;
        }),
    };
}

/**
 * Returns when a person last attempted each puzzle they have, by puzzle id. Only the sort keys are
 * read, which hold the time and the puzzle id, so this stays cheap however many moves were tried.
 */
export async function getLastSeen(username: string): Promise<Record<string, string>> {
    const lastSeen: Record<string, string> = {};
    const items = await queryRange(
        username,
        'ATTEMPT#',
        'ATTEMPT#~',
        Number.POSITIVE_INFINITY,
        'sk',
    );
    for (const { sk } of items) {
        const [, finishedAt, puzzleId] = String(sk).split('#');
        if (puzzleId && finishedAt > (lastSeen[puzzleId] ?? '')) {
            lastSeen[puzzleId] = finishedAt;
        }
    }
    return lastSeen;
}
