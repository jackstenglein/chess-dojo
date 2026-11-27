import { OnlineGameTimeClass } from '@/api/external/onlineGame';
import { GameResult } from '@/database/game';
import { act, cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpeningTree } from './OpeningTree';
import {
    PlayerOpeningTreeProvider,
    usePlayerOpeningTree,
    type PlayerOpeningTreeContextType,
} from './PlayerOpeningTree';
import { Color, SourceType } from './PlayerSource';

const releaseProxy = vi.hoisted(() => Symbol('releaseProxy'));

const harness = vi.hoisted(() => ({
    newLoader: vi.fn(),
    workers: [] as { terminate: ReturnType<typeof vi.fn> }[],
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

vi.mock('comlink', () => ({
    releaseProxy,
    proxy: (fn: unknown) => fn,
    wrap: () => ({
        newLoader: () => harness.newLoader() as unknown,
        [releaseProxy]: vi.fn(),
    }),
}));

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

function treeWith(url: string) {
    const tree = new OpeningTree();
    tree.setGame({
        source: { type: SourceType.Lichess, username: 'bob' },
        playerColor: Color.White,
        white: 'bob',
        black: 'alice',
        whiteElo: 1500,
        normalizedWhiteElo: 1500,
        blackElo: 1400,
        normalizedBlackElo: 1400,
        result: GameResult.White,
        plyCount: 2,
        rated: true,
        url,
        headers: {},
        timeClass: OnlineGameTimeClass.Blitz,
    });
    return tree;
}

function renderTree() {
    const latest = { current: undefined as PlayerOpeningTreeContextType | undefined };
    function Probe() {
        const value = usePlayerOpeningTree();
        const ref = useRef(value);
        ref.current = value;
        latest.current = ref.current;
        return null;
    }
    const view = render(
        <PlayerOpeningTreeProvider>
            <Probe />
        </PlayerOpeningTreeProvider>,
    );
    return { ...view, latest };
}

describe('PlayerOpeningTreeProvider', () => {
    beforeEach(() => {
        harness.newLoader.mockReset();
        harness.workers = [];
        vi.stubGlobal(
            'Worker',
            class {
                terminate = vi.fn();
                constructor() {
                    harness.workers.push(this);
                }
            },
        );
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
        vi.unstubAllGlobals();
    });

    async function loadBob(latest: { current: PlayerOpeningTreeContextType | undefined }) {
        await act(() => {
            return Promise.resolve(
                latest.current?.setSources([{ type: SourceType.Lichess, username: 'bob' }]),
            );
        });
    }

    it('counts indexed games on a second load', async () => {
        harness.newLoader.mockImplementation(() => ({
            load: vi.fn((_sources: unknown, increment: (inc?: number) => void) => {
                increment(100);
                return new OpeningTree();
            }),
        }));
        const { latest } = renderTree();
        await loadBob(latest);

        await act(async () => {
            await latest.current?.onLoad();
        });
        expect(latest.current?.indexedCount).toBe(100);

        await act(async () => {
            await latest.current?.onLoad();
        });
        expect(latest.current?.indexedCount).toBe(100);
    });

    it('keeps the newer tree when an older load finishes last', async () => {
        const older = deferred<OpeningTree>();
        const newer = deferred<OpeningTree>();
        harness.newLoader
            .mockResolvedValueOnce({ load: vi.fn(() => older.promise) })
            .mockResolvedValueOnce({ load: vi.fn(() => newer.promise) });
        const { latest } = renderTree();
        await loadBob(latest);

        const first = latest.current?.onLoad();
        const second = latest.current?.onLoad();
        newer.resolve(treeWith('https://lichess.org/newer'));
        await act(async () => {
            await second;
        });
        older.resolve(treeWith('https://lichess.org/older'));
        await act(async () => {
            await first;
        });

        const tree = latest.current?.openingTree.current;
        expect(tree?.getGame('https://lichess.org/newer')).toBeDefined();
        expect(tree?.getGame('https://lichess.org/older')).toBeUndefined();
    });

    it('terminates the worker when the provider unmounts', () => {
        const { unmount } = renderTree();

        expect(harness.workers).toHaveLength(1);
        unmount();

        expect(harness.workers[0].terminate).toHaveBeenCalledOnce();
    });
});
