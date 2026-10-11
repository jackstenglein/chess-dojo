import {
    PuzzlebasePuzzle,
    UpdatePuzzleRequest,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { defaultTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { usePuzzlebaseData } from './usePuzzlebaseData';

const puzzle = (id: string, over: Partial<PuzzlebasePuzzle> = {}): PuzzlebasePuzzle => ({
    id,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionPgn: 'pgn',
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 600,
    buckets: [],
    themes: [],
    createdAt: 'T0',
    updatedAt: 'T0',
    ...over,
});

/** A client whose saves the test controls. */
function fakeClient(overrides: Partial<PuzzlebaseClient> = {}) {
    const server = new Map<string, PuzzlebasePuzzle>([
        ['001', puzzle('001')],
        ['002', puzzle('002', { rating: 900 })],
    ]);
    const saves: UpdatePuzzleRequest[] = [];
    const fromServer = (id: string): PuzzlebasePuzzle => {
        const found = server.get(id);
        if (!found) {
            throw new Error(`No puzzle ${id} on the fake server`);
        }
        return found;
    };
    const client = {
        listPuzzles: vi.fn(() => Promise.resolve([...server.values()])),
        getTaxonomy: vi.fn(() => Promise.resolve(defaultTaxonomy())),
        getLeaderboard: vi.fn(() => Promise.resolve([])),
        getPuzzle: vi.fn((id: string) => Promise.resolve(fromServer(id))),
        createTheme: vi.fn(() => Promise.resolve(defaultTaxonomy())),
        updatePuzzle: vi.fn((request: UpdatePuzzleRequest) => {
            saves.push(request);
            const saved = { ...fromServer(request.id), ...request };
            server.set(request.id, saved);
            return Promise.resolve(saved);
        }),
        ...overrides,
    } as unknown as PuzzlebaseClient;
    return { client, server, saves, fromServer };
}

async function loaded(client: PuzzlebaseClient) {
    const hook = renderHook(() => usePuzzlebaseData(client));
    await waitFor(() => expect(hook.result.current.loadState).toBe('ready'));
    return hook;
}

describe('usePuzzlebaseData', () => {
    it('loads the puzzles, themes and leaderboard', async () => {
        const { client } = fakeClient();
        const { result } = await loaded(client);
        expect(result.current.puzzles.map((p) => p.id)).toEqual(['001', '002']);
        expect(Object.keys(result.current.taxonomy.buckets)).toContain('Tactics');
    });

    it('reports why loading failed, and can try again', async () => {
        const failing = fakeClient({
            listPuzzles: vi
                .fn()
                .mockRejectedValueOnce({ response: { data: { message: 'Nope' } } })
                .mockResolvedValue([]),
        });
        const hook = renderHook(() => usePuzzlebaseData(failing.client));
        await waitFor(() => expect(hook.result.current.loadState).toBe('error'));
        expect(hook.result.current.loadError).toBe('Nope');

        await act(async () => hook.result.current.reload());
        expect(hook.result.current.loadState).toBe('ready');
    });

    it('shows a change immediately and then keeps what the server saved', async () => {
        const { client, saves } = fakeClient();
        const { result } = await loaded(client);

        act(() => result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1500 })));
        expect(result.current.puzzles[0].rating).toBe(1500);

        await waitFor(() => expect(saves).toEqual([{ id: '001', rating: 1500 }]));
        await waitFor(() => expect(result.current.puzzles[0].rating).toBe(1500));
    });

    it('does not call the server when nothing changed', async () => {
        const { client, saves } = fakeClient();
        const { result } = await loaded(client);
        act(() => result.current.updatePuzzle('001', (p) => ({ ...p })));
        await Promise.resolve();
        expect(saves).toHaveLength(0);
    });

    it('sends quick successive edits to one puzzle one at a time, in order', async () => {
        const order: string[] = [];
        let releaseFirst: () => void = () => undefined;
        const first = new Promise<void>((resolve) => (releaseFirst = resolve));
        const { client, server, fromServer } = fakeClient();
        client.updatePuzzle = vi.fn(async (request: UpdatePuzzleRequest) => {
            order.push(`start ${request.rating}`);
            if (request.rating === 1000) await first;
            const saved = { ...fromServer(request.id), ...request };
            server.set(request.id, saved);
            order.push(`end ${request.rating}`);
            return saved;
        });
        const { result } = await loaded(client);

        act(() => {
            result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1000 }));
            result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1100 }));
        });
        // Both edits are already on screen, and the second builds on the first.
        expect(result.current.puzzles[0].rating).toBe(1100);

        await waitFor(() => expect(order).toEqual(['start 1000']));
        releaseFirst();
        await waitFor(() =>
            expect(order).toEqual(['start 1000', 'end 1000', 'start 1100', 'end 1100']),
        );
        await waitFor(() => expect(result.current.puzzles[0].rating).toBe(1100));
    });

    it('does not flash the first save over a second edit that is still being saved', async () => {
        let releaseFirst: () => void = () => undefined;
        const first = new Promise<void>((resolve) => (releaseFirst = resolve));
        const { client, server, fromServer } = fakeClient();
        client.updatePuzzle = vi.fn(async (request: UpdatePuzzleRequest) => {
            if (request.rating === 1000) await first;
            const saved = { ...fromServer(request.id), ...request };
            server.set(request.id, saved);
            return saved;
        });
        const { result } = await loaded(client);

        act(() => {
            result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1000 }));
            result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1100 }));
        });
        await act(() => {
            releaseFirst();
            return Promise.resolve();
        });
        // The first save finished, but the screen still shows the newer edit.
        expect(result.current.puzzles[0].rating).toBe(1100);
    });

    it('puts a puzzle back to what the server has, and says why, when a save fails', async () => {
        const { client } = fakeClient();
        client.updatePuzzle = vi.fn().mockRejectedValue({
            response: { status: 409, data: { message: 'Someone else changed this puzzle.' } },
        });
        const { result } = await loaded(client);

        act(() => result.current.updatePuzzle('001', (p) => ({ ...p, rating: 1500 })));
        expect(result.current.puzzles[0].rating).toBe(1500);

        await waitFor(() =>
            expect(result.current.notice).toEqual({
                severity: 'error',
                message: 'Someone else changed this puzzle.',
            }),
        );
        await waitFor(() => expect(result.current.puzzles[0].rating).toBe(600));
    });

    it('edits different puzzles independently', async () => {
        const { client, saves } = fakeClient();
        const { result } = await loaded(client);
        act(() => {
            result.current.updatePuzzle('001', (p) => ({ ...p, rating: 700 }));
            result.current.updatePuzzle('002', (p) => ({ ...p, rating: 1000 }));
        });
        await waitFor(() => expect(saves).toHaveLength(2));
        expect(result.current.puzzles.map((p) => p.rating)).toEqual([700, 1000]);
    });

    it('adds a new theme to the themes and then to the puzzle', async () => {
        const taxonomy = defaultTaxonomy();
        taxonomy.buckets.Endgame.push('Wrong bishop');
        const { client, saves } = fakeClient({
            createTheme: vi.fn(() => Promise.resolve(taxonomy)),
        });
        const { result } = await loaded(client);

        await act(async () => result.current.createTheme('001', 'Endgame', 'wrong bishop'));

        expect(result.current.taxonomy.buckets.Endgame).toContain('Wrong bishop');
        expect(result.current.puzzles[0].themes).toEqual(['Wrong bishop']);
        expect(result.current.puzzles[0].buckets).toEqual(['Endgame']);
        await waitFor(() =>
            expect(saves).toEqual([{ id: '001', buckets: ['Endgame'], themes: ['Wrong bishop'] }]),
        );
    });

    it('reports a theme that could not be added, and leaves the puzzle alone', async () => {
        const { client, saves } = fakeClient({
            createTheme: vi.fn().mockRejectedValue({
                response: { data: { message: '"Pin" already exists in Tactics.' } },
            }),
        });
        const { result } = await loaded(client);
        await act(async () => result.current.createTheme('001', 'Endgame', 'pin'));
        expect(result.current.notice?.message).toMatch(/already exists/);
        expect(result.current.puzzles[0].themes).toEqual([]);
        expect(saves).toHaveLength(0);
    });

    it('shows puzzles that were just added', async () => {
        const { client } = fakeClient();
        const { result } = await loaded(client);
        act(() => result.current.addPuzzles([puzzle('003')]));
        expect(result.current.puzzles.map((p) => p.id)).toEqual(['001', '002', '003']);
    });
});
