import { openDB } from 'idb';
import { EngineName, SavedEval } from '../engine/engine';

const DB_NAME = 'chessEngineEvals';
const STORE_NAME = 'evals';
const DB_VERSION = 1;



async function getDb() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
}

export function makeEvalCacheKey(
    fen: string,
    engineName: EngineName,
    depth: number,
    multiPv: number,
    threads: number,
    hash: number,
): string {
    return `${fen}|${engineName}|${depth}|${multiPv}|${threads}|${hash}`;
}

export async function getEvalCache(key: string): Promise<SavedEval | undefined> {
    const db = await getDb();
    return db.get(STORE_NAME, key) as Promise<SavedEval | undefined>;
}

export async function setEvalCache(key: string, eval_: SavedEval): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, eval_, key);
}