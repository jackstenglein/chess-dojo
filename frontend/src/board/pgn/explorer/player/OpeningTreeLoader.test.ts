import { FEN } from '@jackstenglein/chess';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpeningTreeLoader } from './OpeningTreeLoader';
import { Color, MAX_DOWNLOAD_LIMIT, MAX_PLY_COUNT, SourceType } from './PlayerSource';

function lichessGame(id: string) {
    return {
        id,
        rated: true,
        speed: 'blitz',
        status: 'mate',
        winner: 'white',
        players: {
            white: { user: { id: 'bob' }, rating: 1500 },
            black: { user: { id: 'alice' }, rating: 1400 },
        },
        pgn: '1. e4 e5 2. Nf3 Nc6 *',
    };
}

function responseBody(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

describe('OpeningTreeLoader Lichess stream', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('indexes games whose JSON is split across reads', async () => {
        const first = JSON.stringify(lichessGame('game-one'));
        const second = JSON.stringify(lichessGame('game-two'));
        const splitAt = Math.floor(first.length / 2);
        vi.stubGlobal(
            'fetch',
            vi.fn(() => ({
                body: responseBody([
                    first.slice(0, splitAt),
                    `${first.slice(splitAt)}\n${second}\n`,
                ]),
            })),
        );

        const tree = await new OpeningTreeLoader().load(
            [{ type: SourceType.Lichess, username: 'bob' }],
            () => undefined,
            () => undefined,
        );

        expect(tree.getGameCount()).toBe(2);
        const position = tree.getPosition(FEN.start, {
            color: Color.Both,
            win: true,
            draw: true,
            loss: true,
            rated: true,
            casual: true,
            bullet: true,
            blitz: true,
            rapid: true,
            classical: true,
            daily: true,
            opponentRating: [0, 4000],
            downloadLimit: MAX_DOWNLOAD_LIMIT,
            dateRange: ['', ''],
            plyCount: [0, MAX_PLY_COUNT],
            hiddenSources: [],
        });
        expect(position?.white).toBe(2);
        expect(position?.moves.map((move) => move.san)).toEqual(['e4']);
    });

    it('reports a count while loading and does not publish a partial tree', async () => {
        const lines = Array.from({ length: 150 }, (_, i) =>
            JSON.stringify(lichessGame(`game-${i}`)),
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(() => ({
                body: responseBody([`${lines.join('\n')}\n`]),
            })),
        );

        const snapshots: number[] = [];
        const tree = await new OpeningTreeLoader().load(
            [{ type: SourceType.Lichess, username: 'bob' }],
            () => undefined,
            (partial) => snapshots.push(partial.getGameCount()),
        );

        expect(tree.getGameCount()).toBe(150);
        expect(snapshots.length).toBeLessThanOrEqual(1);
        expect(snapshots.every((count) => count === tree.getGameCount())).toBe(true);
    });
});
