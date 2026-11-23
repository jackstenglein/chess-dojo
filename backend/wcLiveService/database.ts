import {
    ConditionalCheckFailedException,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    QueryCommandInput,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { WcAnalysis } from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
import { WcEval, WcGuesses, WcSensei } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { WcCustomGame } from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { dynamo, getUser } from '../directoryService/database';

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

type Item = Record<string, unknown>;

/** The few table operations the service needs. */
interface Store {
    put(hash: string, range: string, item: Item): Promise<void>;
    /** Sets the given attributes, creating the item if needed. */
    set(hash: string, range: string, attrs: Item): Promise<void>;
    /** Sets each attribute only if the item does not have it yet. */
    setIfMissing(hash: string, range: string, attrs: Item): Promise<void>;
    get(hash: string, range: string): Promise<Item | undefined>;
    query(hash: string): Promise<Item[]>;
    /**
     * Writes the item only if its version attribute is still the expected one
     * (or the item does not exist when expected is 0). Returns false otherwise.
     */
    putVersioned(hash: string, range: string, item: Item, expected: number): Promise<boolean>;
}

const dynamoStore: Store = {
    async put(hash, range, item) {
        await dynamo.send(
            new PutItemCommand({
                TableName: WC_LIVE_TABLE,
                Item: marshall({ ...item, hash, range }),
            }),
        );
    },

    async set(hash, range, attrs) {
        const names: Record<string, string> = {};
        const values: Item = {};
        const sets = Object.entries(attrs).map(([key, value], i) => {
            names[`#a${i}`] = key;
            values[`:v${i}`] = value;
            return `#a${i} = :v${i}`;
        });
        await dynamo.send(
            new UpdateItemCommand({
                TableName: WC_LIVE_TABLE,
                Key: marshall({ hash, range }),
                UpdateExpression: `SET ${sets.join(', ')}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: marshall(values),
            }),
        );
    },

    async setIfMissing(hash, range, attrs) {
        const names: Record<string, string> = {};
        const values: Item = {};
        const sets = Object.entries(attrs).map(([key, value], i) => {
            names[`#a${i}`] = key;
            values[`:v${i}`] = value;
            return `#a${i} = if_not_exists(#a${i}, :v${i})`;
        });
        if (sets.length === 0) {
            return;
        }
        await dynamo.send(
            new UpdateItemCommand({
                TableName: WC_LIVE_TABLE,
                Key: marshall({ hash, range }),
                UpdateExpression: `SET ${sets.join(', ')}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: marshall(values),
            }),
        );
    },

    async get(hash, range) {
        const output = await dynamo.send(
            new GetItemCommand({ TableName: WC_LIVE_TABLE, Key: marshall({ hash, range }) }),
        );
        return output.Item ? unmarshall(output.Item) : undefined;
    },

    async putVersioned(hash, range, item, expected) {
        try {
            await dynamo.send(
                new PutItemCommand({
                    TableName: WC_LIVE_TABLE,
                    Item: marshall({ ...item, hash, range }, { removeUndefinedValues: true }),
                    ConditionExpression:
                        expected === 0
                            ? 'attribute_not_exists(#hash) OR #version = :expected'
                            : '#version = :expected',
                    ExpressionAttributeNames:
                        expected === 0
                            ? { '#hash': 'hash', '#version': 'version' }
                            : { '#version': 'version' },
                    ExpressionAttributeValues: marshall({ ':expected': expected }),
                }),
            );
            return true;
        } catch (err) {
            if (err instanceof ConditionalCheckFailedException) {
                return false;
            }
            throw err;
        }
    },

    async query(hash) {
        const items: Item[] = [];
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
    },
};

/**
 * Keeps everything in memory, for running the service on a laptop with
 * localServer.ts. Data is lost when the process stops.
 */
function memoryStore(): Store {
    const tables = new Map<string, Map<string, Item>>();
    const partition = (hash: string) => {
        let p = tables.get(hash);
        if (!p) {
            p = new Map();
            tables.set(hash, p);
        }
        return p;
    };
    return {
        put(hash, range, item) {
            partition(hash).set(range, { ...item, hash, range });
            return Promise.resolve();
        },
        set(hash, range, attrs) {
            const p = partition(hash);
            p.set(range, { ...(p.get(range) ?? { hash, range }), ...attrs });
            return Promise.resolve();
        },
        setIfMissing(hash, range, attrs) {
            const p = partition(hash);
            const current = p.get(range) ?? { hash, range };
            const missing = Object.fromEntries(
                Object.entries(attrs).filter(([key]) => current[key] === undefined),
            );
            p.set(range, { ...current, ...missing });
            return Promise.resolve();
        },
        get(hash, range) {
            return Promise.resolve(partition(hash).get(range));
        },
        putVersioned(hash, range, item, expected) {
            const current = partition(hash).get(range);
            if (((current?.version as number | undefined) ?? 0) !== expected) {
                return Promise.resolve(false);
            }
            partition(hash).set(range, { ...item, hash, range });
            return Promise.resolve(true);
        },
        query(hash) {
            const p = partition(hash);
            return Promise.resolve([...p.keys()].sort().map((k) => p.get(k) as Item));
        },
    };
}

export const isLocal = process.env.WC_LIVE_STORE === 'memory';
const store: Store = isLocal ? memoryStore() : dynamoStore;

/**
 * The name shown on the leaderboard and on sensei evals. Locally there is no
 * users table, so the username stands in.
 */
export async function displayNameFor(username: string): Promise<string> {
    if (isLocal) {
        return username;
    }
    const user = await getUser(username);
    return user.displayName || username;
}

export async function putEval(roundId: string, e: WcEval): Promise<void> {
    await store.put(`EVAL#${roundId}`, `${String(e.ply).padStart(3, '0')}#${e.senseiId}`, {
        ...e,
    });
}

export async function listEvals(roundId: string): Promise<WcEval[]> {
    const items = await store.query(`EVAL#${roundId}`);
    return items.map((i) => ({
        senseiId: i.senseiId as string,
        ply: i.ply as number,
        value: i.value as number,
        updatedAt: i.updatedAt as string,
        updatedBy: i.updatedBy as string,
    }));
}

/**
 * The saved roster entries: color and active changes for account senseis, and
 * every guest. Removed guests are dropped. One partition for the whole match,
 * so guests stay on the bar from game to game.
 */
const ROSTER = 'ROSTER';

export type SavedSensei = WcSensei & { addedAt?: string; removed?: boolean };

export async function listRoster(): Promise<SavedSensei[]> {
    const items = await store.query(ROSTER);
    return items
        .filter((i) => !i.removed)
        .map((i) => ({
            id: i.id as string,
            name: i.name as string,
            color: i.color as string,
            active: i.active as boolean,
            guest: !!i.guest,
            addedAt: i.addedAt as string | undefined,
        }));
}

export async function saveSensei(sensei: SavedSensei): Promise<void> {
    await store.put(ROSTER, sensei.id, { ...sensei });
}

export async function putGuess(
    roundId: string,
    username: string,
    displayName: string,
    ply: number,
    uci: string,
    at: string,
): Promise<void> {
    await store.set(`GUESS#${roundId}`, username, {
        username,
        displayName,
        [`${GUESS_PREFIX}${ply}`]: uci,
        // When the guess for this move was last set, for the cheating checks.
        [`t${ply}`]: at,
    });
    // Every guess and every change, for admins to look back on.
    await store.put(`GUESSLOG#${roundId}`, `${at}#${username}#${ply}`, {
        username,
        ply,
        uci,
        at,
    });
}

/** One guess as it was made, from the guess log. */
export interface GuessLogEntry {
    username: string;
    ply: number;
    uci: string;
    at: string;
}

export async function listGuessLog(roundId: string): Promise<GuessLogEntry[]> {
    return (await store.query(`GUESSLOG#${roundId}`)).map((i) => ({
        username: i.username as string,
        ply: i.ply as number,
        uci: i.uci as string,
        at: i.at as string,
    }));
}

/** Every user's guesses with the time each was last set, for the stats. */
export async function listGuessItems(roundId: string): Promise<
    {
        username: string;
        displayName: string;
        guesses: Record<string, string>;
        times: Record<string, string>;
    }[]
> {
    return (await store.query(`GUESS#${roundId}`)).map((item) => {
        const times: Record<string, string> = {};
        for (const [key, value] of Object.entries(item)) {
            if (/^t\d+$/.test(key) && typeof value === 'string') {
                times[key.slice(1)] = value;
            }
        }
        return { ...toGuesses(item), times };
    });
}

/**
 * When the server first saw each move of a game, by ply. A move's time is
 * written once and never changed, so it is the earliest any server saw it.
 */
export async function recordPlayed(roundId: string, fromPly: number, toPly: number, at: string) {
    const attrs: Item = {};
    for (let p = fromPly; p <= toPly; p++) {
        attrs[`p${p}`] = at;
    }
    await store.setIfMissing(`PLAYED#${roundId}`, 'moves', attrs);
}

export async function getPlayed(roundId: string): Promise<Record<number, string>> {
    const item = await store.get(`PLAYED#${roundId}`, 'moves');
    const played: Record<number, string> = {};
    for (const [key, value] of Object.entries(item ?? {})) {
        if (/^p\d+$/.test(key) && typeof value === 'string') {
            played[parseInt(key.slice(1))] = value;
        }
    }
    return played;
}

function toGuesses(item: Item): WcGuesses {
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
    const item = await store.get(`GUESS#${roundId}`, username);
    return item ? toGuesses(item) : { username, displayName: '', guesses: {} };
}

export async function listGuesses(roundId: string): Promise<WcGuesses[]> {
    return (await store.query(`GUESS#${roundId}`)).map(toGuesses);
}

/** The senseis' analysis of a game: one item per game. */
export async function getAnalysis(roundId: string): Promise<WcAnalysis> {
    const item = await store.get(`ANALYSIS#${roundId}`, 'analysis');
    if (!item) {
        return { roundId, lines: [], version: 0 };
    }
    return {
        roundId,
        lines: (item.lines as string[][] | undefined) ?? [],
        cursor: item.cursor as WcAnalysis['cursor'],
        version: (item.version as number | undefined) ?? 0,
    };
}

/** Saves the analysis if nobody saved since it was read. Returns false if someone did. */
export async function saveAnalysis(analysis: WcAnalysis, readVersion: number): Promise<boolean> {
    return store.putVersioned(
        `ANALYSIS#${analysis.roundId}`,
        'analysis',
        { ...analysis, version: readVersion + 1 },
        readVersion,
    );
}

/** Games senseis added from Lichess links. Removed ones are kept, marked removed. */
const GAMES = 'GAMES';

export async function listCustomGames(): Promise<WcCustomGame[]> {
    const items = await store.query(GAMES);
    return items
        .filter((i) => !i.removed)
        .map((i) => ({
            kind: i.kind as WcCustomGame['kind'],
            id: i.id as string,
            gameId: i.gameId as string | undefined,
            roundId: i.roundId as string | undefined,
            name: i.name as string,
            url: i.url as string,
            addedBy: i.addedBy as string,
            addedAt: i.addedAt as string,
        }))
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export async function saveCustomGame(game: WcCustomGame): Promise<void> {
    await store.put(GAMES, game.id, { ...game, removed: false });
}

export async function removeCustomGame(id: string): Promise<void> {
    await store.set(GAMES, id, { removed: true });
}
