'use client';

import {
    LeaderboardEntry,
    PuzzlebasePuzzle,
    PuzzlebaseTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { normalizeThemeName } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { addTheme, canonicalTheme } from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';
import { useCallback, useEffect, useRef, useState } from 'react';
import { diffToUpdate } from './puzzleDiff';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

/** A message to show the user about something that just happened. */
export interface Notice {
    severity: 'error' | 'warning' | 'success';
    message: string;
}

/**
 * Loads the puzzles, themes and leaderboard, and saves changes to puzzles.
 *
 * Changes show up on screen immediately and are saved in the background. Changes to the same
 * puzzle are sent one at a time, in order, so quick successive edits (like adding two tags) cannot
 * overwrite each other. If a save fails, the puzzle is reloaded from the server and the reason is
 * reported in `notice`.
 */
export function usePuzzlebaseData(client: PuzzlebaseClient) {
    const [puzzles, setPuzzlesState] = useState<PuzzlebasePuzzle[]>([]);
    const [taxonomy, setTaxonomy] = useState<PuzzlebaseTaxonomy>({ buckets: {} });
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [loadError, setLoadError] = useState<string>();
    const [notice, setNotice] = useState<Notice>();

    // The latest puzzles, readable synchronously, so back-to-back edits build on each other.
    const latest = useRef<PuzzlebasePuzzle[]>([]);
    // The saves waiting to finish for each puzzle, and how many there are.
    const queue = useRef(new Map<string, { tail: Promise<void>; count: number }>());

    const setPuzzles = useCallback((update: (prev: PuzzlebasePuzzle[]) => PuzzlebasePuzzle[]) => {
        latest.current = update(latest.current);
        setPuzzlesState(latest.current);
    }, []);

    const replacePuzzle = useCallback(
        (puzzle: PuzzlebasePuzzle) =>
            setPuzzles((prev) => prev.map((p) => (p.id === puzzle.id ? puzzle : p))),
        [setPuzzles],
    );

    const fetchAll = useCallback(async () => {
        try {
            const [loadedPuzzles, loadedTaxonomy, loadedLeaderboard] = await Promise.all([
                client.listPuzzles(),
                client.getTaxonomy(),
                client.getLeaderboard(),
            ]);
            setPuzzles(() => loadedPuzzles);
            setTaxonomy(loadedTaxonomy);
            setLeaderboard(loadedLeaderboard);
            setLoadState('ready');
        } catch (err) {
            setLoadError(errorMessage(err));
            setLoadState('error');
        }
    }, [client, setPuzzles]);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    /** Loads everything again, showing the loading state while it does. */
    const reload = useCallback(() => {
        setLoadState('loading');
        return fetchAll();
    }, [fetchAll]);

    const refreshLeaderboard = useCallback(async () => {
        try {
            setLeaderboard(await client.getLeaderboard());
        } catch {
            // The leaderboard is a nicety. Keep showing the old one.
        }
    }, [client]);

    /** Applies a change to a puzzle on screen right away, and saves it in the background. */
    const updatePuzzle = useCallback(
        (id: string, change: (puzzle: PuzzlebasePuzzle) => PuzzlebasePuzzle) => {
            const before = latest.current.find((p) => p.id === id);
            if (!before) {
                return;
            }

            const after = change(before);
            replacePuzzle(after);
            const request = diffToUpdate(before, after);
            if (!request) {
                return;
            }

            const entry = queue.current.get(id) ?? { tail: Promise.resolve(), count: 0 };
            entry.count++;
            let saved: PuzzlebasePuzzle | undefined;

            entry.tail = entry.tail.then(async () => {
                let failure: unknown;
                try {
                    saved = await client.updatePuzzle(request);
                } catch (err) {
                    failure = err;
                }

                entry.count--;
                if (failure !== undefined) {
                    setNotice({ severity: 'error', message: errorMessage(failure) });
                }
                if (entry.count > 0) {
                    // More edits are on their way. Wait for the last one to settle the screen.
                    return;
                }

                // The last save has finished. Show what the server has, which is the truth even if
                // an earlier save failed.
                try {
                    replacePuzzle(saved ?? (await client.getPuzzle(id)));
                } catch {
                    // Keep showing what we have.
                }
            });
            queue.current.set(id, entry);
        },
        [client, replacePuzzle],
    );

    /** Adds a theme to a bucket, and then to a puzzle. */
    const createTheme = useCallback(
        async (puzzleId: string, bucket: string, theme: string) => {
            try {
                const updated = await client.createTheme({ bucket, theme });
                setTaxonomy(updated);
                updatePuzzle(puzzleId, (p) => ({
                    ...p,
                    ...addTheme(
                        updated,
                        p,
                        canonicalTheme(updated, theme) ?? normalizeThemeName(theme),
                        bucket,
                    ),
                }));
            } catch (err) {
                setNotice({ severity: 'error', message: errorMessage(err) });
            }
        },
        [client, updatePuzzle],
    );

    /** Deletes a theme from a bucket, for admins, and refreshes the puzzles that lost it. */
    const deleteTheme = useCallback(
        async (bucket: string, theme: string) => {
            try {
                const result = await client.deleteTheme({ bucket, theme });
                setTaxonomy(result.taxonomy);
                if (result.puzzlesChanged > 0) {
                    const loaded = await client.listPuzzles();
                    setPuzzles(() => loaded);
                }
                setNotice({
                    severity: 'success',
                    message:
                        result.puzzlesChanged > 0
                            ? `Deleted "${theme}" and removed it from ${result.puzzlesChanged} puzzle${result.puzzlesChanged === 1 ? '' : 's'}.`
                            : `Deleted "${theme}".`,
                });
            } catch (err) {
                setNotice({ severity: 'error', message: errorMessage(err) });
            }
        },
        [client, setPuzzles],
    );

    /** Shows puzzles that were just added, and refreshes the leaderboard. */
    const addPuzzles = useCallback(
        (added: PuzzlebasePuzzle[]) => {
            setPuzzles((prev) => [...prev, ...added]);
            void refreshLeaderboard();
        },
        [refreshLeaderboard, setPuzzles],
    );

    return {
        puzzles,
        taxonomy,
        leaderboard,
        loadState,
        loadError,
        reload,
        notice,
        setNotice,
        updatePuzzle,
        replacePuzzle,
        createTheme,
        deleteTheme,
        addPuzzles,
    };
}
