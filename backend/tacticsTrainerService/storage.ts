import { gunzipSync, gzipSync } from 'zlib';

/**
 * DynamoDB items are capped at 400 KB. The progress blob is gzipped and kept under this size,
 * leaving room for the other attributes.
 */
export const MAX_PACKED_BYTES = 350_000;

/** Thrown when progress cannot be made small enough to store. */
export class ProgressTooLargeError extends Error {}

type Attempt = unknown[];
interface Session {
    attempts?: Attempt[];
}

/**
 * Gzips the app's progress for storage. Very long histories are trimmed to fit: first the
 * per-move timing of the oldest sessions is dropped, then each oldest attempt's whole detail
 * record. Puzzle records, ladders and totals are never trimmed.
 * @param progress The app's saved state.
 * @param maxBytes The size limit for the gzipped result.
 * @returns The gzipped JSON and how many sessions were trimmed.
 */
export function packProgress(
    progress: Record<string, unknown>,
    maxBytes = MAX_PACKED_BYTES,
): { packed: Buffer; trimmedSessions: number } {
    let packed = gzipSync(JSON.stringify(progress));
    if (packed.length <= maxBytes) {
        return { packed, trimmedSessions: 0 };
    }

    const copy = structuredClone(progress) as { sessions?: Session[] };
    const sessions = Array.isArray(copy.sessions) ? copy.sessions : [];
    for (const dropWholeDetail of [false, true]) {
        for (let i = 0; i < sessions.length; i++) {
            for (const attempt of sessions[i].attempts ?? []) {
                const detail = attempt[5] as Record<string, unknown> | null | undefined;
                if (!detail) continue;
                if (dropWholeDetail) attempt[5] = null;
                else delete detail.moves;
            }
            // Re-check every few sessions; gzip is the slow part.
            if (i % 5 === 4 || i === sessions.length - 1) {
                packed = gzipSync(JSON.stringify(copy));
                if (packed.length <= maxBytes) {
                    return { packed, trimmedSessions: i + 1 };
                }
            }
        }
    }
    throw new ProgressTooLargeError(`progress is ${packed.length} bytes gzipped after trimming`);
}

/**
 * Reverses packProgress.
 * @param packed The stored gzipped JSON.
 * @returns The app's saved state.
 */
export function unpackProgress(packed: Uint8Array): Record<string, unknown> {
    return JSON.parse(gunzipSync(packed).toString('utf8')) as Record<string, unknown>;
}
