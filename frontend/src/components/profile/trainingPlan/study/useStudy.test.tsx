import { UpdateUserProgressRequest, UpdateUserTimelineRequest } from '@/api/userApi';
import { BoardApi } from '@/board/Board';
import { Timer, TimerContext } from '@/components/timer/TimerContext';
import { Course, CourseModuleType, CourseType } from '@/database/course';
import { Game } from '@/database/game';
import {
    Requirement,
    RequirementCategory,
    RequirementProgress,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { Chess } from '@jackstenglein/chess';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemsOf } from './book';
import { clearCourseCache } from './courseCache';
import { StudyReady, StudySource, useStudy } from './useStudy';

const PGN_A = '[Event "A"]\n[White "Keres"]\n[Black "Smyslov"]\n[Result "*"]\n\n*';
const PGN_B = '[Event "B"]\n[White "Tal"]\n[Black "Botvinnik"]\n[Result "*"]\n\n*';
const KEY_A = 'course:STUDY/study-1/m1/0';
const KEY_B = 'course:STUDY/study-1/m2/0';

const course = {
    type: CourseType.Study,
    id: 'study-1',
    name: 'Master Games',
    allowExport: false,
    chapters: [
        { name: 'Keres vs Smyslov', modules: [pgnModule('m1', PGN_A)] },
        { name: 'Tal vs Botvinnik', modules: [pgnModule('m2', PGN_B)] },
    ],
} as unknown as Course;

function pgnModule(id: string, pgn: string) {
    return {
        id,
        name: '',
        type: CourseModuleType.PgnViewer,
        description: '',
        postscript: '',
        videoUrls: [],
        pgns: [pgn],
        coach: '',
        positions: [],
        boardOrientation: 'white',
    };
}

const task = {
    id: 'task-1',
    status: RequirementStatus.Active,
    category: RequirementCategory.Middlegames,
    name: 'Study Master Games',
    description: '',
    freeDescription: '',
    counts: { '1500-1600': 45 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 1,
    unitScoreOverride: {},
    totalScore: 0,
    videoUrls: [],
    positions: [],
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    progressBarSuffix: 'Games',
    updatedAt: '',
    sortPriority: '1',
    expirationDays: -1,
    isFree: false,
    blockers: [],
    atomic: false,
    expectedMinutes: 0,
    material: [{ kind: 'COURSE', courseType: 'STUDY', courseId: 'study-1' }],
} as Requirement;

/** Shaped like Polgar M2 on dev, scaled down: one count for every cohort, a start of 6, two course parts. */
const polgar = {
    ...task,
    id: 'polgar',
    name: 'Solve Polgar M2s through Problem {{count}}',
    counts: { '1000-1100': 8, '1500-1600': 12, '2400+': 20 },
    startCount: 6,
    progressBarSuffix: 'Exercises',
    material: [
        { kind: 'COURSE', courseType: 'STUDY', courseId: 'p1' },
        { kind: 'COURSE', courseType: 'STUDY', courseId: 'p2' },
    ],
} as Requirement;

function problems(courseId: string, from: number, to: number): Course {
    const modules = Array.from({ length: to - from + 1 }, (_, i) => ({
        ...pgnModule(`${courseId}-m${i}`, `[Event "Problem ${from + i}"]\n\n*`),
        name: `Problem ${from + i}`,
    }));
    return {
        type: CourseType.Study,
        id: courseId,
        name: `Polgar ${from}-${to}`,
        allowExport: false,
        chapters: [{ name: `Problems ${from}-${to}`, modules }],
    } as unknown as Course;
}
/** Shaped like Silman Part 2 on dev: counted in pages from a start, over a course of chapters. */
const silman = {
    ...task,
    id: 'silman',
    name: 'Read Silman Endgame, Part 2',
    counts: { '1500-1600': 54 },
    startCount: 30,
    progressBarSuffix: 'Pages',
} as Requirement;
/** Shaped like Silman Part 1 on dev: a set counted in pages, one target of 30, no start. */
const silmanPart1 = {
    ...task,
    id: 'silman1',
    name: 'Read Silman Endgame, Part 1',
    counts: { '1500-1600': 30 },
    progressBarSuffix: ' Pages',
} as Requirement;

/** Parts of 8 and 6 problems, 14 items for a book that runs from 7 to 20. */
const part1 = problems('p1', 7, 14);
const part2 = problems('p2', 15, 20);
const POLGAR_SOURCE: StudySource = { kind: 'task', taskId: 'polgar' };

function copyOf(id: string, key: string, pgn: string, headers: Record<string, string> = {}): Game {
    return {
        cohort: '1500-1600',
        id,
        owner: 'student',
        pgn,
        orientation: 'white',
        updatedAt: `${id}-v1`,
        headers: {
            White: 'Keres',
            Black: 'Smyslov',
            Date: '',
            Site: '',
            Result: '*',
            StudyItem: key,
            StudyExport: 'false',
            ...headers,
        },
    } as unknown as Game;
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const mocks = vi.hoisted(() => ({
    api: {
        getUser: vi.fn(),
        getCourse: vi.fn(),
        getDirectory: vi.fn(),
        listGamesByOwner: vi.fn(),
        listUserTimeline: vi.fn(),
        getGame: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        updateUserProgress: vi.fn(),
        updateUserTimeline: vi.fn(),
    },
    updateSearchParams: vi.fn(),
    updateUser: vi.fn(),
    trackEvent: vi.fn(),
    user: {
        username: 'student',
        dojoCohort: '1500-1600',
        progress: {},
        customTasks: [],
        timerTaskId: '',
    },
    // When set, every render gets a new api object, as the real provider does after a user update.
    freshApi: false,
}));

vi.mock('@/api/Api', () => ({ useApi: () => (mocks.freshApi ? { ...mocks.api } : mocks.api) }));
vi.mock('@/analytics/events', () => ({
    EventType: { UpdateProgress: 'update_progress' },
    trackEvent: mocks.trackEvent,
}));
vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'Loading', Authenticated: 'Authenticated' },
    useAuth: () => ({
        status: 'Authenticated',
        user: mocks.user,
        updateUser: mocks.updateUser,
    }),
}));
vi.mock('@/api/cache/requirements', () => ({
    useRequirements: () => ({
        requirements: [task, polgar, silman, silmanPart1],
        request: { isSent: () => true, isLoading: () => false },
    }),
}));
vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: () => ({
        searchParams: new URLSearchParams(),
        updateSearchParams: mocks.updateSearchParams,
    }),
}));

const timer = {
    isRunning: false,
    isPaused: false,
    timerSeconds: 0,
    task: undefined,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onClear: vi.fn(),
    onRestart: vi.fn(),
} as unknown as Timer;

const wrapper = ({ children }: { children: ReactNode }) => (
    <TimerContext.Provider value={timer}>{children}</TimerContext.Provider>
);

const TASK_SOURCE: StudySource = { kind: 'task', taskId: 'task-1' };
const COURSE_SOURCE: StudySource = { kind: 'course', courseType: 'STUDY', courseId: 'study-1' };

function renderStudy(urlKey: string | null = null, source: StudySource = TASK_SOURCE) {
    return renderHook(() => useStudy(source, urlKey), { wrapper });
}

async function ready(urlKey: string | null = null, source: StudySource = TASK_SOURCE) {
    const rendered = renderStudy(urlKey, source);
    await waitFor(() => expect(rendered.result.current.status).toBe('ready'));
    const study = () => {
        const s = rendered.result.current;
        if (s.status !== 'ready') throw new Error(`status ${s.status}`);
        return s;
    };
    return { ...rendered, study };
}

/** Mounts a real chess instance on the hook, the way PgnBoard's onInitialize does. */
function attachBoard(study: ReturnType<typeof useStudy>, pgn: string): Chess {
    if (study.status !== 'ready') throw new Error('not ready');
    const chess = new Chess({ pgn });
    study.onBoardInitialize({} as BoardApi, chess);
    return chess;
}

beforeEach(() => {
    clearCourseCache();
    for (const fn of Object.values(mocks.api)) fn.mockReset();
    mocks.updateSearchParams.mockReset();
    mocks.updateUser.mockReset();
    mocks.trackEvent.mockReset();
    mocks.user = {
        username: 'student',
        dojoCohort: '1500-1600',
        progress: {},
        customTasks: [],
        timerTaskId: '',
    };
    mocks.api.getUser.mockResolvedValue({ data: mocks.user });
    mocks.api.getCourse.mockImplementation((_type: string, id: string) =>
        Promise.resolve({
            data: {
                course: id === 'p1' ? part1 : id === 'p2' ? part2 : course,
                isBlocked: false,
            },
        }),
    );
    mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [] } });
    mocks.api.listUserTimeline.mockResolvedValue({ entries: [], lastEvaluatedKey: '' });
    (timer.onStart as ReturnType<typeof vi.fn>).mockReset();
    (timer.onClear as ReturnType<typeof vi.fn>).mockReset();
    (timer.onRestart as ReturnType<typeof vi.fn>).mockReset();
    timer.timerSeconds = 0;
    timer.task = undefined;
    mocks.freshApi = false;
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useStudy: book, current item and done marks', () => {
    it('opens on the URL item when it exists', async () => {
        const { study } = await ready(KEY_B);
        expect(study().current.key).toBe(KEY_B);
        expect(study().book.chapters).toHaveLength(2);
    });

    it('opens on the first item without a working copy otherwise', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        const { study } = await ready();
        expect(study().current.key).toBe(KEY_B);
    });

    it('opens on the first item not yet marked done', async () => {
        const entry = {
            requirementId: 'task-1',
            studyInfo: { itemKey: KEY_A, itemName: KEY_A },
        } as TimelineEntry;
        mocks.api.listUserTimeline.mockResolvedValue({ entries: [entry], lastEvaluatedKey: '' });
        const { study } = await ready();
        expect(study().current.key).toBe(KEY_B);
    });

    it('still opens when the timeline cannot be read', async () => {
        mocks.api.listUserTimeline.mockRejectedValue(new Error('offline'));
        const { study } = await ready();
        expect(study().current.key).toBe(KEY_A);
        expect(study().session?.historyComplete).toBe(true);
    });

    it('starts the timer on the task when it is idle, once', async () => {
        await ready();
        expect(timer.onStart).toHaveBeenCalledTimes(1);
        expect(timer.onStart).toHaveBeenCalledWith('task-1');
    });

    it("leaves a paused timer on another task alone before that task loads, and resumes the task's own", async () => {
        // The timer's own task has not loaded, so the context names no task.
        timer.timerSeconds = 1500;
        mocks.user = { ...mocks.user, timerTaskId: 'polgar' };
        const other = await ready();
        expect(timer.onStart).not.toHaveBeenCalled();
        other.unmount();

        mocks.user = { ...mocks.user, timerTaskId: 'task-1' };
        await ready();
        expect(timer.onStart).toHaveBeenCalledTimes(1);
        expect(timer.onStart).toHaveBeenCalledWith('task-1');
    });

    it('keeps the book and the board when the api object is rebuilt', async () => {
        mocks.freshApi = true;
        const { study, rerender } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        rerender();
        rerender();
        expect(study().status).toBe('ready');
        expect(study().board).toBeDefined();
        expect(mocks.api.getCourse).toHaveBeenCalledTimes(1);
        expect(mocks.api.listGamesByOwner).toHaveBeenCalledTimes(1);
        expect(mocks.api.listUserTimeline).toHaveBeenCalledTimes(1);
    });

    it('follows the URL to another item, unless edits are pending', async () => {
        const rendered = renderHook(
            ({ key }: { key: string | null }) => useStudy(TASK_SOURCE, key),
            {
                wrapper,
                initialProps: { key: KEY_A },
            },
        );
        const study = () => {
            const s = rendered.result.current;
            if (s.status !== 'ready') throw new Error(`status ${s.status}`);
            return s;
        };
        await waitFor(() => expect(rendered.result.current.status).toBe('ready'));
        expect(study().current.key).toBe(KEY_A);

        rendered.rerender({ key: KEY_B });
        await waitFor(() => expect(study().current.key).toBe(KEY_B));
        expect(mocks.updateSearchParams).not.toHaveBeenCalled();

        mocks.api.createGame.mockRejectedValue(new Error('boom'));
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_B);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().pendingEdits).toBe(true));
        rendered.rerender({ key: KEY_A });
        expect(study().current.key).toBe(KEY_B);
    });

    it('restores the initial item when Back returns to the URL without one', async () => {
        const rendered = renderHook(
            ({ key }: { key: string | null }) => useStudy(TASK_SOURCE, key),
            {
                wrapper,
                initialProps: { key: null as string | null },
            },
        );
        const study = () => {
            const s = rendered.result.current;
            if (s.status !== 'ready') throw new Error(`status ${s.status}`);
            return s;
        };
        await waitFor(() => expect(rendered.result.current.status).toBe('ready'));
        expect(study().current.key).toBe(KEY_A);
        const itemB = itemsOf(study().book).find((item) => item.key === KEY_B);
        if (!itemB) throw new Error('item B missing');
        act(() => {
            expect(study().select(itemB)).toBe(true);
        });
        rendered.rerender({ key: KEY_B });
        expect(study().current.key).toBe(KEY_B);

        rendered.rerender({ key: null });
        await waitFor(() => expect(study().current.key).toBe(KEY_A));
    });

    it('collects done marks across timeline pages and from a new entry at once', async () => {
        const entry = (key: string, requirementId = 'task-1') =>
            ({ requirementId, studyInfo: { itemKey: key, itemName: key } }) as TimelineEntry;
        mocks.api.listUserTimeline
            .mockResolvedValueOnce({ entries: [entry(KEY_A)], lastEvaluatedKey: 'page-2' })
            .mockResolvedValueOnce({ entries: [entry(KEY_B, 'other')], lastEvaluatedKey: '' });
        mocks.api.updateUserProgress.mockResolvedValue({
            data: { user: mocks.user, timelineEntry: { id: 'e', requirementId: 'task-1' } },
        });
        const { study } = await ready();
        await waitFor(() => expect(study().session?.historyComplete).toBe(true));
        expect([...(study().session?.done ?? [])]).toEqual([KEY_A]);

        await act(() => study().session?.markItemDone(study().book.chapters[1].items[0]));
        expect([...(study().session?.done ?? [])].sort()).toEqual([KEY_A, KEY_B]);
    });

    it('carries the task, its cohort and counts in the session', async () => {
        const { study } = await ready();
        expect(study().session).toMatchObject({
            task: { id: 'task-1' },
            cohort: '1500-1600',
            currentCount: 0,
            totalCount: 45,
        });
    });
});

describe('useStudy: browsing a course without a task', () => {
    it('opens the course with no session, no timeline load and no timer', async () => {
        const { study } = await ready(KEY_A, COURSE_SOURCE);
        expect(study().session).toBeUndefined();
        expect(study().book.chapters).toHaveLength(2);
        expect(study().current.key).toBe(KEY_A);
        expect(mocks.api.getCourse).toHaveBeenCalledWith('STUDY', 'study-1');
        expect(mocks.api.listUserTimeline).not.toHaveBeenCalled();
        expect(timer.onStart).not.toHaveBeenCalled();
    });

    it('still finds the working copies', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(null, COURSE_SOURCE);
        expect(study().current.key).toBe(KEY_B);
        expect(study().workedOn.has(KEY_A)).toBe(true);
    });

    it('reports a course the member cannot open as blocked', async () => {
        mocks.api.getCourse.mockResolvedValue({ data: { course, isBlocked: true } });
        const rendered = renderStudy(null, COURSE_SOURCE);
        await waitFor(() => expect(rendered.result.current.status).toBe('blocked'));
        expect(rendered.result.current).toMatchObject({ course: { id: 'study-1' } });
        expect((rendered.result.current as { task?: unknown }).task).toBeUndefined();
    });

    it('creates the working copy from the first edit while browsing', async () => {
        mocks.api.createGame.mockResolvedValue({ data: copyOf('copy-a', KEY_A, PGN_A) });
        mocks.api.updateGame.mockImplementation(
            (_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({ data: copyOf(id, KEY_A, req.pgnText) }),
        );
        const { study } = await ready(KEY_A, COURSE_SOURCE);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(mocks.api.createGame).toHaveBeenCalledTimes(1);
        expect(study().workedOn.has(KEY_A)).toBe(true);
    });
});

describe('useStudy: the board for the current item', () => {
    it('shows a canonical game silently unsaved when there is no copy', async () => {
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        expect(study().board).toMatchObject({
            key: `${KEY_A}:read`,
            pgn: PGN_A,
            mode: { kind: 'read' },
            disableExport: true,
            context: { isOwner: true, unsaved: true, silentUnsaved: true },
        });
        expect(study().board?.context.game).toBeUndefined();
    });

    it('leaves an existing copy to the board and never creates a second one', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(mocks.api.createGame).not.toHaveBeenCalled();
        expect(study().pendingEdits).toBe(false);
        expect(study().board?.context.game?.id).toBe('copy-a');
        expect(study().board?.disableExport).toBe(true);
    });

    it('keeps export on a copy of a course that allows it', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A, { StudyExport: 'true' });
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(study().board?.disableExport).toBe(false);
    });

    it('keeps a version ref per game, so a late save carries its own game version', async () => {
        const copyA = copyOf('copy-a', KEY_A, PGN_A);
        const copyB = copyOf('copy-b', KEY_B, PGN_B);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copyA, copyB] } });
        mocks.api.getGame.mockImplementation((_c: string, id: string) =>
            Promise.resolve({ data: id === 'copy-a' ? copyA : copyB }),
        );
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game?.id).toBe('copy-a'));
        const refA = study().board?.context.updatedAtRef;
        expect(refA?.current).toBe('copy-a-v1');

        act(() => {
            study().select(study().book.chapters[1].items[0]);
        });
        await waitFor(() => expect(study().board?.context.game?.id).toBe('copy-b'));
        const refB = study().board?.context.updatedAtRef;
        expect(refB?.current).toBe('copy-b-v1');
        expect(refA?.current).toBe('copy-a-v1');
        expect(refA).not.toBe(refB);
    });

    it('opens the saved copy when one exists', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A + ' 1. e4');
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(mocks.api.getGame).toHaveBeenCalledWith('1500-1600', 'copy-a');
        expect(study().board?.context).toMatchObject({ isOwner: true, game: { id: 'copy-a' } });
        expect(study().board?.context.unsaved).toBeUndefined();
    });
});

describe('useStudy: the first-change copy', () => {
    it('creates the copy from the first edit, folds later edits into one update, then flips', async () => {
        const create = deferred<{ data: Game }>();
        mocks.api.createGame.mockReturnValue(create.promise);
        mocks.api.updateGame.mockImplementation(
            (_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({
                    data: { ...copyOf(id, KEY_A, req.pgnText), updatedAt: `${id}-v2` },
                }),
        );
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);

        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(mocks.api.createGame).toHaveBeenCalledTimes(1));
        expect(study().pendingEdits).toBe(true);
        const [createReq] = mocks.api.createGame.mock.calls[0] as [
            { pgnText: string; type: string },
        ];
        expect(createReq.type).toBe('clone');
        expect(createReq.pgnText).toContain(`[StudyItem "${KEY_A}"]`);
        expect(createReq.pgnText).toContain('[StudyExport "false"]');
        expect(createReq.pgnText).toMatch(/\[StudyStamp "[0-9a-f]{12}"\]/);
        expect(createReq.pgnText).toContain('1. e4');
        expect(createReq.pgnText).not.toContain('e5');

        act(() => {
            chess.move('e5');
        });
        expect(mocks.api.updateGame).not.toHaveBeenCalled();

        act(() => create.resolve({ data: copyOf('copy-a', KEY_A, createReq.pgnText) }));
        await waitFor(() => expect(study().board?.context.game).toBeDefined());

        expect(mocks.api.createGame).toHaveBeenCalledTimes(1);
        expect(mocks.api.updateGame).toHaveBeenCalledTimes(1);
        const [cohort, id, updateReq] = mocks.api.updateGame.mock.calls[0] as [
            string,
            string,
            { pgnText: string; updatedAt: string; type: string },
        ];
        expect([cohort, id]).toEqual(['1500-1600', 'copy-a']);
        expect(updateReq.type).toBe('editor');
        expect(updateReq.updatedAt).toBe('copy-a-v1');
        expect(updateReq.pgnText).toContain('e5');
        expect(study().pendingEdits).toBe(false);
        expect(study().workedOn.has(KEY_A)).toBe(true);
        expect(study().board?.pgn).toBe(PGN_A);
        expect(study().board?.key).toBe(`${KEY_A}:read`);
    });

    it('runs a second update for an edit made during the first and flips once', async () => {
        const create = deferred<{ data: Game }>();
        const update1 = deferred<{ data: Game }>();
        mocks.api.createGame.mockReturnValue(create.promise);
        mocks.api.updateGame
            .mockReturnValueOnce(update1.promise)
            .mockImplementation((_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({ data: { ...copyOf(id, KEY_A, req.pgnText), updatedAt: 'v3' } }),
            );
        const { study, result } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);

        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(mocks.api.createGame).toHaveBeenCalledTimes(1));
        act(() => {
            chess.move('e5');
        });
        act(() => create.resolve({ data: copyOf('copy-a', KEY_A, PGN_A) }));
        await waitFor(() => expect(mocks.api.updateGame).toHaveBeenCalledTimes(1));
        act(() => {
            chess.move('Nf3');
        });
        expect(study().board?.context.game).toBeUndefined();

        act(() => update1.resolve({ data: { ...copyOf('copy-a', KEY_A, ''), updatedAt: 'v2' } }));
        await waitFor(() => expect(mocks.api.updateGame).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        const second = mocks.api.updateGame.mock.calls[1] as [
            string,
            string,
            { pgnText: string; updatedAt: string },
        ];
        expect(second[2].updatedAt).toBe('v2');
        expect(second[2].pgnText).toContain('Nf3');
        expect(result.current.status === 'ready' && result.current.pendingEdits).toBe(false);
    });

    it('stays canonical after a failed create and creates again on the next edit', async () => {
        mocks.api.createGame
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValue({ data: copyOf('copy-a', KEY_A, PGN_A) });
        mocks.api.updateGame.mockImplementation(
            (_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({ data: copyOf(id, KEY_A, req.pgnText) }),
        );
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);

        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().copyRequest.isFailure()).toBe(true));
        expect(study().board?.context.unsaved).toBe(true);
        expect(study().pendingEdits).toBe(true);

        act(() => {
            chess.move('e5');
        });
        await waitFor(() => expect(mocks.api.createGame).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        const [secondCreate] = mocks.api.createGame.mock.calls[1] as [{ pgnText: string }];
        expect(secondCreate.pgnText).toContain('e5');
        await waitFor(() => expect(study().copyRequest.isFailure()).toBe(false));
    });

    it('keeps the copy after a failed update and retries against it on the next edit', async () => {
        const create = deferred<{ data: Game }>();
        mocks.api.createGame.mockReturnValue(create.promise);
        mocks.api.updateGame
            .mockRejectedValueOnce(new Error('conflict'))
            .mockImplementation((_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({ data: copyOf(id, KEY_A, req.pgnText) }),
            );
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);

        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(mocks.api.createGame).toHaveBeenCalledTimes(1));
        act(() => {
            chess.move('e5');
        });
        act(() => create.resolve({ data: copyOf('copy-a', KEY_A, PGN_A) }));
        await waitFor(() => expect(study().copyRequest.isFailure()).toBe(true));
        expect(mocks.api.updateGame).toHaveBeenCalledTimes(1);
        expect(study().board?.context.game).toBeUndefined();
        expect(study().pendingEdits).toBe(true);

        act(() => {
            chess.move('Nf3');
        });
        await waitFor(() => expect(mocks.api.updateGame).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(mocks.api.createGame).toHaveBeenCalledTimes(1);
        const second = mocks.api.updateGame.mock.calls[1] as [string, string, { pgnText: string }];
        expect(second[1]).toBe('copy-a');
        expect(second[2].pgnText).toContain('Nf3');
    });

    it('refetches a saved game when the item is reopened after switching away', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(mocks.api.getGame).toHaveBeenCalledTimes(1);

        act(() => {
            study().select(study().book.chapters[1].items[0]);
        });
        await waitFor(() => expect(study().board?.key).toBe(`${KEY_B}:read`));
        act(() => {
            study().select(study().book.chapters[0].items[0]);
        });
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(mocks.api.getGame).toHaveBeenCalledTimes(2);
    });

    it('refuses to change item while edits are unsaved after a failed create', async () => {
        mocks.api.createGame.mockRejectedValue(new Error('boom'));
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().copyRequest.isFailure()).toBe(true));
        expect(study().pendingEdits).toBe(true);

        let accepted = true;
        act(() => {
            accepted = study().select(study().book.chapters[1].items[0]);
        });
        expect(accepted).toBe(false);
        expect(study().current.key).toBe(KEY_A);
    });

    it('refuses to change item while a write is pending', async () => {
        const create = deferred<{ data: Game }>();
        mocks.api.createGame.mockReturnValue(create.promise);
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(mocks.api.createGame).toHaveBeenCalledTimes(1));

        const other = study().book.chapters[1].items[0];
        let accepted = true;
        act(() => {
            accepted = study().select(other);
        });
        expect(accepted).toBe(false);
        expect(study().current.key).toBe(KEY_A);
        expect(mocks.updateSearchParams).not.toHaveBeenCalled();
    });
});

describe('useStudy: a workbook read as one book, sliced to the cohort', () => {
    function names(study: () => ReturnType<typeof useStudy> & { status: 'ready' }) {
        return study().book.chapters.flatMap((c) => c.items.map((i) => i.name));
    }

    it('loads every material entry and shows the cohort share of the book', async () => {
        const { study } = await ready(null, POLGAR_SOURCE);
        expect(mocks.api.getCourse).toHaveBeenCalledTimes(2);
        expect(study().book.title).toBe('Solve Polgar M2s through Problem 12');
        // 1500-1600 runs to 12, so positions 7 to 12. Six items, all from the first part.
        expect(names(study)).toEqual([
            'Problem 7',
            'Problem 8',
            'Problem 9',
            'Problem 10',
            'Problem 11',
            'Problem 12',
        ]);
        expect(study().session?.mapping).toEqual({
            mapped: true,
            startCount: 6,
            unit: 'exercises',
        });
        expect(study().session?.totalCount).toBe(12);
    });

    it('is blocked when any part is blocked', async () => {
        mocks.api.getCourse.mockImplementation((_type: string, id: string) =>
            Promise.resolve({
                data: { course: id === 'p2' ? part2 : part1, isBlocked: id === 'p2' },
            }),
        );
        const rendered = renderStudy(null, POLGAR_SOURCE);
        await waitFor(() => expect(rendered.result.current.status).toBe('blocked'));
    });

    it('ticks everything the pointer has passed and opens on the item after it', async () => {
        mocks.user = {
            ...mocks.user,
            progress: {
                polgar: {
                    requirementId: 'polgar',
                    counts: { ALL_COHORTS: 9 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        };
        const { study } = await ready(null, POLGAR_SOURCE);
        expect(study().session?.currentCount).toBe(9);
        const keys = study().book.chapters.flatMap((c) => c.items.map((i) => i.key));
        expect([...(study().session?.done ?? [])].sort()).toEqual(keys.slice(0, 3).sort());
        expect(study().current.name).toBe('Problem 10');
    });

    it('keeps the pointer fill in place when a mark lies past it', async () => {
        // The cohort's slice is Problems 7 to 12 and count 10 is four done. With Problem 12
        // marked in the history, the fill stops at Problem 9 and the page opens on Problem 10.
        mocks.user = {
            ...mocks.user,
            progress: {
                polgar: {
                    requirementId: 'polgar',
                    counts: { ALL_COHORTS: 10 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
        };
        const problem12 = 'course:STUDY/p1/p1-m5/0';
        mocks.api.listUserTimeline.mockResolvedValueOnce({
            entries: [
                {
                    requirementId: 'polgar',
                    studyInfo: { itemKey: problem12, itemName: 'Problem 12' },
                } as TimelineEntry,
            ],
            lastEvaluatedKey: '',
        });
        const { study } = await ready(null, POLGAR_SOURCE);
        const keys = study().book.chapters.flatMap((c) => c.items.map((i) => i.key));
        expect(keys[5]).toBe(problem12);
        expect([...(study().session?.done ?? [])].sort()).toEqual(
            [...keys.slice(0, 3), problem12].sort(),
        );
        expect(study().current.name).toBe('Problem 10');
    });

    it('browses another cohort share of the task with no session', async () => {
        const { study } = await ready(null, {
            kind: 'task',
            taskId: 'polgar',
            cohort: '1000-1100',
        });
        expect(study().session).toBeUndefined();
        expect(names(study)).toEqual(['Problem 7', 'Problem 8']);
        expect(mocks.api.listUserTimeline).not.toHaveBeenCalled();
        expect(timer.onStart).not.toHaveBeenCalled();
    });

    it('leaves a set task exactly as before', async () => {
        const { study } = await ready();
        expect(study().session?.mapping).toEqual({ mapped: false, startCount: 0, unit: '' });
        expect(study().book.chapters).toHaveLength(2);
    });
});

describe("useStudy: the board's own saves", () => {
    it('refuses to switch while the board holds unsaved edits', async () => {
        const { study } = await ready(KEY_A);
        const other = study().book.chapters[1].items[0];
        act(() => study().onBoardUnsaved(true));
        expect(study().select(other)).toBe(false);
        expect(study().current.key).toBe(KEY_A);
        act(() => study().onBoardUnsaved(false));
        expect(study().select(other)).toBe(true);
    });

    it('applies a save response only to the game it was for, and moves the version with it', async () => {
        const copy = copyOf('copy-a', KEY_A, PGN_A);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game?.id).toBe('copy-a'));
        const ref = study().board?.context.updatedAtRef;
        expect(ref?.current).toBe('copy-a-v1');

        act(() =>
            study().board?.context.onUpdateGame?.({
                ...copy,
                id: 'copy-b',
                updatedAt: 'copy-b-v2',
            }),
        );
        expect(study().board?.context.game?.id).toBe('copy-a');
        expect(ref?.current).toBe('copy-a-v1');

        act(() => study().board?.context.onUpdateGame?.({ ...copy, updatedAt: 'copy-a-v2' }));
        await waitFor(() => expect(study().board?.context.game?.updatedAt).toBe('copy-a-v2'));
        expect(ref?.current).toBe('copy-a-v2');
    });
});

describe('useStudy: the mode of each item', () => {
    const PUZZLE =
        '[Event "Problem 7"]\n[FEN "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1"]\n[SetUp "1"]\n\n1. Ra8# *';

    it('presets solve from a position start and read from a game, keyed by mode', async () => {
        mocks.api.getCourse.mockImplementation((_type: string, id: string) =>
            Promise.resolve({
                data: {
                    course:
                        id === 'p1'
                            ? {
                                  ...part1,
                                  chapters: [
                                      {
                                          name: 'Problems',
                                          modules: [
                                              { ...pgnModule('p1-m0', PUZZLE), name: 'Problem 7' },
                                              { ...pgnModule('p1-m1', PGN_A), name: 'Game 8' },
                                          ],
                                      },
                                  ],
                              }
                            : part2,
                    isBlocked: false,
                },
            }),
        );
        const { study } = await ready(null, POLGAR_SOURCE);
        await waitFor(() => expect(study().board).toBeDefined());
        const puzzle = study().current;
        expect(study().board).toMatchObject({
            key: `${puzzle.key}:solve`,
            mode: { kind: 'solve', playBothSides: false },
        });

        act(() => {
            study().setMode(puzzle, 'read');
        });
        expect(study().board).toMatchObject({ key: `${puzzle.key}:read`, mode: { kind: 'read' } });

        const game = study().book.chapters[0].items[1];
        act(() => {
            study().select(game);
        });
        await waitFor(() => expect(study().board?.key).toBe(`${game.key}:read`));
        expect(study().board?.mode).toEqual({ kind: 'read' });
        act(() => {
            study().setMode(game, 'solve');
        });
        expect(study().board).toMatchObject({
            key: `${game.key}:solve`,
            mode: { kind: 'solve', playBothSides: false },
        });
    });
});

describe('useStudy: the mode switch and unsaved edits', () => {
    it('refuses a mode change while edits are pending and changes nothing', async () => {
        mocks.api.createGame.mockRejectedValue(new Error('boom'));
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        let changed: boolean | undefined;
        act(() => {
            changed = study().setMode(study().current, 'solve');
        });
        expect(changed).toBe(true);
        expect(study().board?.key).toBe(`${KEY_A}:solve`);
        act(() => {
            changed = study().setMode(study().current, 'read');
        });
        expect(changed).toBe(true);
        expect(study().board?.key).toBe(`${KEY_A}:read`);

        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().pendingEdits).toBe(true));
        act(() => {
            changed = study().setMode(study().current, 'solve');
        });
        expect(changed).toBe(false);
        expect(study().board?.key).toBe(`${KEY_A}:read`);
        expect(study().board?.mode).toEqual({ kind: 'read' });
    });
});

describe('useStudy: the PGN a remounted board loads', () => {
    it('carries the edits and headers of a first-edit copy through a mode round trip', async () => {
        mocks.api.createGame.mockImplementation((req: { pgnText: string }) =>
            Promise.resolve({ data: copyOf('copy-a', KEY_A, req.pgnText) }),
        );
        mocks.api.updateGame.mockImplementation(
            (_c: string, id: string, req: { pgnText: string }) =>
                Promise.resolve({ data: copyOf(id, KEY_A, req.pgnText) }),
        );
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board).toBeDefined());
        expect(study().board?.latestPgn()).toBe(PGN_A);
        const chess = attachBoard(study(), PGN_A);
        act(() => {
            chess.move('e4');
        });
        await waitFor(() => expect(study().board?.context.game).toBeDefined());
        expect(study().pendingEdits).toBe(false);

        act(() => {
            expect(study().setMode(study().current, 'solve')).toBe(true);
        });
        act(() => {
            expect(study().setMode(study().current, 'read')).toBe(true);
        });
        expect(study().board?.key).toBe(`${KEY_A}:read`);
        expect(study().board?.pgn).toBe(PGN_A);
        const latest = study().board?.latestPgn();
        expect(latest).toContain(`[StudyItem "${KEY_A}"]`);
        expect(latest).toMatch(/\[StudyStamp "[0-9a-f]{12}"\]/);
        expect(latest).toContain('1. e4');

        act(() => {
            study().select(study().book.chapters[1].items[0]);
        });
        await waitFor(() => expect(study().board?.key).toBe(`${KEY_B}:read`));
        expect(study().board?.latestPgn()).toBe(PGN_B);
    });

    it('carries the edits of an existing copy through a mode round trip after the board saved', async () => {
        const copyPgn = PGN_A.replace('\n\n', `\n[StudyItem "${KEY_A}"]\n\n`);
        const copy = copyOf('copy-a', KEY_A, copyPgn);
        mocks.api.listGamesByOwner.mockResolvedValue({ data: { games: [copy] } });
        mocks.api.getGame.mockResolvedValue({ data: copy });
        const { study } = await ready(KEY_A);
        await waitFor(() => expect(study().board?.context.game?.id).toBe('copy-a'));
        const chess = attachBoard(study(), copyPgn);
        act(() => {
            chess.move('e4');
        });
        // The board's own save moves the version ref and leaves the loaded game as it was.
        const ref = study().board?.context.updatedAtRef;
        if (ref) ref.current = 'copy-a-v2';

        act(() => {
            study().setMode(study().current, 'solve');
        });
        act(() => {
            study().setMode(study().current, 'read');
        });
        expect(study().board?.pgn).toBe(copyPgn);
        const latest = study().board?.latestPgn();
        expect(latest).toContain(`[StudyItem "${KEY_A}"]`);
        expect(latest).toContain('1. e4');
        expect(study().board?.context.updatedAtRef?.current).toBe('copy-a-v2');
    });
});

describe('useStudy: marking an item without the dialog', () => {
    const progressAt = (count: number, requirementId = 'polgar') => ({
        requirementId,
        counts: { ALL_COHORTS: count },
        minutesSpent: { '1500-1600': 30 },
        updatedAt: '',
    });
    /** Answers like the deployed backend, which drops studyInfo from the entry. */
    const answer = (posted: UpdateUserProgressRequest) =>
        Promise.resolve({
            data: {
                user: {
                    ...mocks.user,
                    progress: {
                        [posted.requirementId]: progressAt(posted.newCount, posted.requirementId),
                    },
                },
                timelineEntry: {
                    id: 'entry-1',
                    requirementId: posted.requirementId,
                    previousCount: posted.previousCount,
                    newCount: posted.newCount,
                },
            },
        });

    it('posts one count up with the mark and the timer minutes, and keeps the mark', async () => {
        mocks.user = { ...mocks.user, timerTaskId: 'polgar' };
        const fresh = { ...mocks.user, progress: { polgar: progressAt(10) } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        mocks.api.updateUserProgress.mockImplementation(answer);
        timer.timerSeconds = 7 * 60 + 59;
        const { study } = await ready(null, POLGAR_SOURCE);
        const item = study().current;
        expect(study().session?.done.has(item.key)).toBe(false);

        await act(() => study().session?.markItemDone(item));
        expect(mocks.updateUser).toHaveBeenCalledWith(fresh);
        expect(mocks.api.updateUserProgress).toHaveBeenCalledWith({
            cohort: '1500-1600',
            requirementId: 'polgar',
            previousCount: 10,
            newCount: 11,
            incrementalMinutesSpent: 7,
            date: null,
            notes: '',
            studyInfo: { itemKey: item.key, itemName: item.name },
        });
        expect(study().session?.done.has(item.key)).toBe(true);
        expect(study().session?.canUndo).toBe(true);
        // The 59 seconds the post did not count carry over to the next item.
        expect(timer.onRestart).toHaveBeenCalledTimes(1);
        expect(timer.onRestart).toHaveBeenCalledWith('polgar', 59);
        expect(mocks.trackEvent).toHaveBeenCalledWith('update_progress', {
            requirement_id: 'polgar',
            requirement_name: 'Solve Polgar M2s through Problem {{count}}',
            is_custom_requirement: false,
            dojo_cohort: '1500-1600',
            previous_count: 10,
            new_count: 11,
            incremental_minutes: 7,
        });
    });

    it('posts a second mark only after the first, on the count the first one wrote', async () => {
        let stored = progressAt(10);
        mocks.api.getUser.mockImplementation(() =>
            Promise.resolve({ data: { ...mocks.user, progress: { polgar: stored } } }),
        );
        const release = deferred<undefined>();
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) => {
            stored = progressAt(posted.newCount);
            const response = answer(posted);
            return mocks.api.updateUserProgress.mock.calls.length === 1
                ? release.promise.then(() => response)
                : response;
        });
        const { study } = await ready(null, POLGAR_SOURCE);
        const [first, second] = study().book.chapters[0].items;
        let secondSettled = false;
        act(() => {
            void study().session?.markItemDone(first);
            void study()
                .session?.markItemDone(second)
                .then(() => (secondSettled = true));
        });
        await waitFor(() => expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            studyInfo: { itemKey: first.key },
            previousCount: 10,
            newCount: 11,
        });
        await act(() => Promise.resolve());
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1);
        expect(secondSettled).toBe(false);

        act(() => release.resolve(undefined));
        await waitFor(() => expect(secondSettled).toBe(true));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(2);
        expect(mocks.api.updateUserProgress.mock.calls[1][0]).toMatchObject({
            studyInfo: { itemKey: second.key },
            previousCount: 11,
            newCount: 12,
        });
        expect(study().session?.done.has(first.key)).toBe(true);
        expect(study().session?.done.has(second.key)).toBe(true);
    });

    it('posts a queued mark with the minutes since the mark before it', async () => {
        let stored = progressAt(10);
        const read = () =>
            Promise.resolve({ data: { ...mocks.user, progress: { polgar: stored } } });
        // The second count refresh answers the way the network does, after the first mark's
        // timer restart has rendered.
        const refresh = deferred<undefined>();
        mocks.api.getUser
            .mockImplementationOnce(read)
            .mockImplementation(() => refresh.promise.then(read));
        const release = deferred<undefined>();
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) => {
            stored = progressAt(posted.newCount);
            const response = answer(posted);
            return mocks.api.updateUserProgress.mock.calls.length === 1
                ? release.promise.then(() => response)
                : response;
        });
        // Like TimerContextProvider, hand out a new timer object on every render.
        function FreshTimer({ children }: { children: ReactNode }) {
            const [seconds, setSeconds] = useState(600);
            const value: Timer = {
                ...timer,
                timerSeconds: seconds,
                onRestart: (_taskId: string, from = 0) => setSeconds(from),
            };
            return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
        }
        const rendered = renderHook(() => useStudy(POLGAR_SOURCE, null), { wrapper: FreshTimer });
        await waitFor(() => expect(rendered.result.current.status).toBe('ready'));
        const study = () => rendered.result.current as StudyReady;
        const [first, second] = study().book.chapters[0].items;
        act(() => {
            void study().session?.markItemDone(first);
        });
        await waitFor(() => expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1));
        // The member solves the next item while the first post is pending.
        let secondSettled = false;
        act(() => {
            void study()
                .session?.markItemDone(second)
                .then(() => (secondSettled = true));
        });
        act(() => release.resolve(undefined));
        await waitFor(() => expect(mocks.api.getUser).toHaveBeenCalledTimes(2));
        act(() => refresh.resolve(undefined));
        await waitFor(() => expect(secondSettled).toBe(true));
        const minutes = mocks.api.updateUserProgress.mock.calls.map(
            ([posted]) => (posted as UpdateUserProgressRequest).incrementalMinutesSpent,
        );
        expect(minutes).toEqual([10, 0]);
    });

    it('counts no minutes and leaves the timer alone when it runs on another task', async () => {
        mocks.api.updateUserProgress.mockImplementation(answer);
        timer.timerSeconds = 600;
        // The timer's own task has not loaded, so the context names no task.
        mocks.user = { ...mocks.user, timerTaskId: 'task-1' };
        const { study } = await ready(null, POLGAR_SOURCE);
        await act(() => study().session?.markItemDone(study().current));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            previousCount: 6,
            newCount: 7,
            incrementalMinutesSpent: 0,
        });
        expect(timer.onRestart).not.toHaveBeenCalled();
    });

    it('never lowers a count that is already past the target', async () => {
        const fresh = { ...mocks.user, progress: { polgar: progressAt(15) } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        mocks.api.updateUserProgress.mockImplementation(answer);
        const { study } = await ready(null, POLGAR_SOURCE);
        await act(() => study().session?.markItemDone(study().current));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            previousCount: 15,
            newCount: 15,
        });
    });

    it("posts this tab's count when the server read fails", async () => {
        mocks.api.getUser.mockRejectedValue(new Error('offline'));
        mocks.api.updateUserProgress.mockImplementation(answer);
        const { study } = await ready(null, POLGAR_SOURCE);
        await act(() => study().session?.markItemDone(study().current));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            previousCount: 6,
            newCount: 7,
        });
        expect(mocks.updateUser).not.toHaveBeenCalled();
    });

    it('records a mark on a book counted in pages and leaves the count where it was', async () => {
        const fresh = { ...mocks.user, progress: { silman: progressAt(40, 'silman') } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        mocks.api.updateUserProgress.mockImplementation(answer);
        const { study } = await ready(null, { kind: 'task', taskId: 'silman' });
        expect(study().session?.mapping).toEqual({ mapped: false, startCount: 30, unit: 'pages' });
        const item = study().current;
        await act(() => study().session?.markItemDone(item));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            requirementId: 'silman',
            previousCount: 40,
            newCount: 40,
            studyInfo: { itemKey: item.key, itemName: item.name },
        });
        expect(study().session?.done.has(item.key)).toBe(true);
        expect(study().session?.canUndo).toBe(true);
    });

    it('records a mark on a set counted in pages and leaves the count where it was', async () => {
        const fresh = { ...mocks.user, progress: { silman1: progressAt(4, 'silman1') } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        mocks.api.updateUserProgress.mockImplementation(answer);
        const { study } = await ready(null, { kind: 'task', taskId: 'silman1' });
        expect(study().session?.mapping).toEqual({ mapped: false, startCount: 0, unit: '' });
        const item = study().current;
        await act(() => study().session?.markItemDone(item));
        expect(mocks.api.updateUserProgress.mock.calls[0][0]).toMatchObject({
            requirementId: 'silman1',
            previousCount: 4,
            newCount: 4,
            studyInfo: { itemKey: item.key, itemName: item.name },
        });
        expect(study().session?.done.has(item.key)).toBe(true);
    });

    it('undoes the last mark by deleting its entry with the progress from before', async () => {
        const fresh = { ...mocks.user, progress: { polgar: progressAt(10) } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        mocks.api.updateUserProgress.mockImplementation(answer);
        mocks.api.updateUserTimeline.mockResolvedValue({ data: fresh });
        const { study } = await ready(null, POLGAR_SOURCE);
        const item = study().current;
        await act(() => study().session?.markItemDone(item));
        expect(study().session?.done.has(item.key)).toBe(true);

        await act(() => study().session?.undoMark(item.key));
        expect(mocks.api.updateUserTimeline).toHaveBeenCalledWith({
            requirementId: 'polgar',
            progress: progressAt(10),
            updated: [],
            deleted: [
                {
                    id: 'entry-1',
                    requirementId: 'polgar',
                    previousCount: 10,
                    newCount: 11,
                    studyInfo: { itemKey: item.key, itemName: item.name },
                },
            ],
        });
        expect(study().session?.done.has(item.key)).toBe(false);
        expect(study().session?.canUndo).toBe(false);
    });

    it('offers undo only on the item that was marked last', async () => {
        mocks.api.updateUserProgress.mockImplementation(answer);
        const { study } = await ready(null, POLGAR_SOURCE);
        const first = study().current;
        await act(() => study().session?.markItemDone(first));
        expect(study().session?.canUndo).toBe(true);
        act(() => {
            study().select(study().book.chapters[0].items[1]);
        });
        await waitFor(() => expect(study().session?.canUndo).toBe(false));
        act(() => {
            study().select(first);
        });
        await waitFor(() => expect(study().session?.canUndo).toBe(true));
    });

    it('posts one mark for an item asked twice while the first is in flight', async () => {
        const release = deferred<undefined>();
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) =>
            release.promise.then(() => answer(posted)),
        );
        const { study } = await ready(null, POLGAR_SOURCE);
        const item = study().current;
        let settled = 0;
        act(() => {
            void study()
                .session?.markItemDone(item)
                .then(() => settled++);
            void study()
                .session?.markItemDone(item)
                .then(() => settled++);
        });
        await waitFor(() => expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1));
        act(() => release.resolve(undefined));
        await waitFor(() => expect(settled).toBe(2));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1);
        expect(study().session?.done.has(item.key)).toBe(true);

        await act(() => study().session?.markItemDone(item));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1);
    });

    it('runs an undo asked during a mark after it, against the progress that mark replaced', async () => {
        const fresh = { ...mocks.user, progress: { polgar: progressAt(10) } };
        mocks.api.getUser.mockResolvedValue({ data: fresh });
        const release = deferred<undefined>();
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) =>
            release.promise.then(() => answer(posted)),
        );
        mocks.api.updateUserTimeline.mockResolvedValue({ data: fresh });
        const { study } = await ready(null, POLGAR_SOURCE);
        const item = study().current;
        act(() => {
            void study().session?.markItemDone(item);
        });
        await waitFor(() => expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1));
        let undone = false;
        act(() => {
            void study()
                .session?.undoMark(item.key)
                .then(() => (undone = true));
        });
        await act(() => Promise.resolve());
        expect(mocks.api.updateUserTimeline).not.toHaveBeenCalled();
        expect(undone).toBe(false);

        act(() => release.resolve(undefined));
        await waitFor(() => expect(undone).toBe(true));
        expect(mocks.api.updateUserTimeline).toHaveBeenCalledWith({
            requirementId: 'polgar',
            progress: progressAt(10),
            updated: [],
            deleted: [
                {
                    id: 'entry-1',
                    requirementId: 'polgar',
                    previousCount: 10,
                    newCount: 11,
                    studyInfo: { itemKey: item.key, itemName: item.name },
                },
            ],
        });
        expect(study().session?.done.has(item.key)).toBe(false);
        expect(study().session?.canUndo).toBe(false);
    });

    it('undoes nothing when a later mark has replaced the one Undo was clicked on', async () => {
        let stored: RequirementProgress = progressAt(10);
        mocks.api.getUser.mockImplementation(() =>
            Promise.resolve({ data: { ...mocks.user, progress: { polgar: stored } } }),
        );
        const release = deferred<undefined>();
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) => {
            stored = progressAt(posted.newCount);
            const reply = answer(posted);
            return posted.newCount === 12 ? release.promise.then(() => reply) : reply;
        });
        const { study } = await ready(null, POLGAR_SOURCE);
        const [first, second] = study().book.chapters[0].items;
        await act(() => study().session?.markItemDone(first));
        expect(study().session?.canUndo).toBe(true);
        let undone = false;
        act(() => {
            void study().session?.markItemDone(second);
            void study()
                .session?.undoMark(first.key)
                .then(() => (undone = true));
        });
        act(() => release.resolve(undefined));
        await waitFor(() => expect(undone).toBe(true));
        expect(mocks.api.updateUserTimeline).not.toHaveBeenCalled();
        expect(study().session?.done.has(first.key)).toBe(true);
        expect(study().session?.done.has(second.key)).toBe(true);
    });

    it('rejects both callers when the post fails, then posts again on the next attempt', async () => {
        mocks.api.getUser.mockResolvedValue({
            data: { ...mocks.user, progress: { polgar: progressAt(10) } },
        });
        const failure = new Error('progress write failed');
        mocks.api.updateUserProgress.mockRejectedValueOnce(failure).mockImplementation(answer);
        const { study } = await ready(null, POLGAR_SOURCE);
        const item = study().current;
        const outcomes: string[] = [];
        act(() => {
            void study()
                .session?.markItemDone(item)
                .then(
                    () => outcomes.push('ok'),
                    () => outcomes.push('failed'),
                );
            void study()
                .session?.markItemDone(item)
                .then(
                    () => outcomes.push('ok'),
                    () => outcomes.push('failed'),
                );
        });
        await waitFor(() => expect(outcomes).toEqual(['failed', 'failed']));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1);
        expect(study().session?.done.has(item.key)).toBe(false);
        expect(study().session?.canUndo).toBe(false);

        await act(() => study().session?.markItemDone(item));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(2);
        expect(mocks.api.updateUserProgress.mock.calls[1][0]).toMatchObject({
            previousCount: 10,
            newCount: 11,
            studyInfo: { itemKey: item.key },
        });
        expect(study().session?.done.has(item.key)).toBe(true);
        expect(study().session?.canUndo).toBe(true);
    });

    it('posts a mark asked during an undo only after the undo', async () => {
        let stored: RequirementProgress = progressAt(10);
        mocks.api.getUser.mockImplementation(() =>
            Promise.resolve({ data: { ...mocks.user, progress: { polgar: stored } } }),
        );
        mocks.api.updateUserProgress.mockImplementation((posted: UpdateUserProgressRequest) => {
            stored = progressAt(posted.newCount);
            return answer(posted);
        });
        const release = deferred<undefined>();
        mocks.api.updateUserTimeline.mockImplementation((req: UpdateUserTimelineRequest) => {
            stored = req.progress;
            return release.promise.then(() => ({
                data: { ...mocks.user, progress: { polgar: req.progress } },
            }));
        });
        const { study } = await ready(null, POLGAR_SOURCE);
        const [first, second] = study().book.chapters[0].items;
        await act(() => study().session?.markItemDone(first));
        let marked = false;
        act(() => {
            void study().session?.undoMark(first.key);
            void study()
                .session?.markItemDone(second)
                .then(() => (marked = true));
        });
        await waitFor(() => expect(mocks.api.updateUserTimeline).toHaveBeenCalledTimes(1));
        await act(() => Promise.resolve());
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(1);
        expect(marked).toBe(false);

        act(() => release.resolve(undefined));
        await waitFor(() => expect(marked).toBe(true));
        expect(mocks.api.updateUserProgress).toHaveBeenCalledTimes(2);
        expect(mocks.api.updateUserProgress.mock.calls[1][0]).toMatchObject({
            studyInfo: { itemKey: second.key },
            previousCount: 10,
            newCount: 11,
        });
        expect(study().session?.done.has(first.key)).toBe(false);
        expect(study().session?.done.has(second.key)).toBe(true);
    });
});
