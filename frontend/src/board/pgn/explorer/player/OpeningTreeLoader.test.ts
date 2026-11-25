import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpeningTreeLoader } from './OpeningTreeLoader';
import { SourceType } from './PlayerSource';

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
            vi.fn(async () => ({
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
    });
});
