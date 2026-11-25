'use client';

import { useApi } from '@/api/Api';
import {
    getTacticsForgerLeaderboard,
    getTacticsForgerProgress,
    saveTacticsForgerProgress,
} from '@/api/puzzleApi';
import { useAuth } from '@/auth/Auth';
import {
    ForgerGoalDialog,
    TACTICS_FORGER_TASK_DESCRIPTION,
    TACTICS_FORGER_TASK_ID,
} from '@/components/profile/trainingPlan/ForgerGoalDialog';
import { CustomTask, RequirementProgress, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, dojoCohorts, User } from '@/database/user';
import { SaveTacticsForgerProgressRequest } from '@jackstenglein/chess-dojo-common/src/tacticsTrainer/api';
import { Box } from '@mui/material';
import { AxiosError } from 'axios';
import { DateTime } from 'luxon';
import { useEffect, useRef, useState } from 'react';
import { ForgerAnalysis, ForgerAnalysisDialog } from './ForgerAnalysisDialog';

/** Messages the embedded app sends. Each one gets a reply with the same id. */
type ForgerRequest =
    | { source: 'tactics-forger'; id: number; type: 'hello' }
    | { source: 'tactics-forger'; id: number; type: 'load' }
    | { source: 'tactics-forger'; id: number; type: 'save'; body: SaveTacticsForgerProgressRequest }
    | { source: 'tactics-forger'; id: number; type: 'leaderboard' }
    | { source: 'tactics-forger'; id: number; type: 'analyze'; body: ForgerAnalysis }
    | {
          source: 'tactics-forger';
          id: number;
          type: 'logTime';
          body: { minutes: number; puzzles: number; session?: number | null };
      }
    | { source: 'tactics-forger'; id: number; type: 'backfill'; body: { sessions: PastSession[] } };

/**
 * Shows the static Tactics Forger app in a full-height frame and lets it load and save the
 * signed-in user's progress. The app runs in a same-origin iframe and asks over postMessage;
 * this component makes the authenticated API calls and replies with the result (or the HTTP
 * status, so the app can handle 409 conflicts).
 */
/** The task as first added: Tactics, time only, no goal (the user can set one with Edit). */
function forgerTask(username: string): CustomTask {
    return {
        id: TACTICS_FORGER_TASK_ID,
        owner: username,
        name: 'Dojo Tactics Forger',
        description: TACTICS_FORGER_TASK_DESCRIPTION,
        counts: Object.fromEntries(dojoCohorts.map((c) => [c, 0])),
        scoreboardDisplay: ScoreboardDisplay.NonDojo,
        category: 'Tactics' as CustomTask['category'],
        numberOfCohorts: 1,
        progressBarSuffix: 'Minutes',
        updatedAt: new Date().toISOString(),
    };
}

/** The timeline entry of the Forger session being played: it grows as more minutes come in. */
interface ForgerVisit {
    entry: TimelineEntry;
    progress: RequirementProgress;
    session: number | null;
    day: string;
}

/** A past Forger session to add to the training plan. */
interface PastSession {
    start: number;
    minutes: number;
    puzzles: number;
}

export function TacticsForgerFrame({ src }: { src: string }) {
    const frame = useRef<HTMLIFrameElement>(null);
    const { user } = useAuth();
    const api = useApi();
    const [analysis, setAnalysis] = useState<ForgerAnalysis | null>(null);
    // Asked once, right after the task is added to the plan: pick a goal (or not now).
    const [askGoal, setAskGoal] = useState(false);
    // The message handler outlives renders, so it reads the latest user and API through refs.
    const latest = useRef<{ user?: User; api: typeof api }>({ user, api });
    useEffect(() => {
        latest.current = { user, api };
    }, [user, api]);
    const visit = useRef<ForgerVisit | null>(null);
    // The task's progress as of the last write (the user object can lag behind).
    const lastProgress = useRef<RequirementProgress | null>(null);
    const taskAdded = useRef(false);
    // Training-plan writes go one at a time (live minutes and past sessions can overlap).
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const inTurn = <T,>(fn: () => Promise<T>): Promise<T> => {
        const run = queue.current.then(fn, fn);
        queue.current = run.catch(() => undefined);
        return run;
    };

    /** Adds the Forger task to the user's plan the first time, and asks for a goal. */
    const ensureTask = async (u: User, a: typeof api) => {
        if (taskAdded.current || u.customTasks?.some((t) => t.id === TACTICS_FORGER_TASK_ID))
            return;
        await a.updateUser({ customTasks: [...(u.customTasks ?? []), forgerTask(u.username)] });
        taskAdded.current = true;
        setAskGoal(true);
    };

    /**
     * Starts a timeline entry on the task (dated `date`, or now), saved as a normal task's entry
     * rather than a custom one's so the time shows like any other training on the heatmap.
     */
    const newEntry = async (
        u: User,
        a: typeof api,
        minutes: number,
        notes: string,
        date: DateTime | null,
    ) => {
        const before =
            (lastProgress.current ?? u.progress?.[TACTICS_FORGER_TASK_ID])?.counts?.[ALL_COHORTS] ??
            0;
        const res = await a.updateUserProgress({
            requirementId: TACTICS_FORGER_TASK_ID,
            cohort: u.dojoCohort,
            previousCount: before,
            newCount: before + minutes,
            incrementalMinutesSpent: minutes,
            date,
            notes,
        });
        const entry: TimelineEntry = { ...res.data.timelineEntry, isCustomRequirement: false };
        const progress = res.data.user.progress[TACTICS_FORGER_TASK_ID];
        await a.updateUserTimeline({
            requirementId: TACTICS_FORGER_TASK_ID,
            progress,
            updated: [entry],
            deleted: [],
        });
        lastProgress.current = progress;
        return { entry, progress };
    };

    /** Live minutes: one timeline entry per Forger session (and day), growing as you play. */
    const logTime = (minutes: number, puzzles: number, session: number | null) =>
        inTurn(async () => {
            const { user: u, api: a } = latest.current;
            if (!u || minutes < 1) throw new Error('not signed in');
            await ensureTask(u, a);
            const cohort = u.dojoCohort;
            const today = new Date().toDateString();
            const v = visit.current;
            if (v?.day === today && v.session === session) {
                const total = (v.progress.minutesSpent?.[cohort] ?? 0) + minutes;
                const count = (v.progress.counts?.[ALL_COHORTS] ?? 0) + minutes;
                const progress: RequirementProgress = {
                    ...v.progress,
                    minutesSpent: { ...v.progress.minutesSpent, [cohort]: total },
                    counts: { ...v.progress.counts, [ALL_COHORTS]: count },
                    updatedAt: new Date().toISOString(),
                };
                const entry: TimelineEntry = {
                    ...v.entry,
                    minutesSpent: v.entry.minutesSpent + minutes,
                    totalMinutesSpent: total,
                    newCount: count,
                    notes: forgerNotes(puzzlesIn(v.entry) + puzzles),
                    isCustomRequirement: false,
                };
                await a.updateUserTimeline({
                    requirementId: TACTICS_FORGER_TASK_ID,
                    progress,
                    updated: [entry],
                    deleted: [],
                });
                lastProgress.current = progress;
                visit.current = { entry, progress, session, day: today };
                return;
            }
            const made = await newEntry(u, a, minutes, forgerNotes(puzzles), null);
            visit.current = { ...made, session, day: today };
        });

    /** Past sessions (from before live logging): one entry each, dated when it was played. */
    const backfill = (sessions: PastSession[]) =>
        inTurn(async () => {
            const { user: u, api: a } = latest.current;
            if (!u) throw new Error('not signed in');
            await ensureTask(u, a);
            for (const s of sessions) {
                if (s.minutes < 1) continue;
                await newEntry(
                    u,
                    a,
                    Math.round(s.minutes),
                    forgerNotes(s.puzzles),
                    DateTime.fromMillis(s.start),
                );
            }
        });

    useEffect(() => {
        const onMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.source !== frame.current?.contentWindow) return;
            const msg = event.data as ForgerRequest;
            if (msg?.source !== 'tactics-forger' || typeof msg.id !== 'number') return;

            const reply = (payload: Record<string, unknown>) =>
                frame.current?.contentWindow?.postMessage(
                    { source: 'tactics-forger-host', id: msg.id, ...payload },
                    window.location.origin,
                );
            try {
                switch (msg.type) {
                    case 'hello':
                        // The app says hello until this listener is up, then starts loading.
                        // The cohort lets it suggest where to start.
                        reply({ ok: true, username: user?.username, cohort: user?.dojoCohort });
                        break;
                    case 'load': {
                        const res = await getTacticsForgerProgress();
                        reply({
                            ok: true,
                            data: res.data,
                            username: user?.username,
                            cohort: user?.dojoCohort,
                        });
                        break;
                    }
                    case 'save': {
                        const res = await saveTacticsForgerProgress(msg.body);
                        reply({ ok: true, data: res.data });
                        break;
                    }
                    case 'logTime':
                        await logTime(
                            Math.round(msg.body.minutes),
                            msg.body.puzzles,
                            msg.body.session ?? null,
                        );
                        reply({ ok: true });
                        break;
                    case 'backfill':
                        await backfill(msg.body.sessions);
                        reply({ ok: true });
                        break;
                    case 'analyze':
                        // Open the puzzle on the analysis board (Stockfish) over the frame.
                        setAnalysis(msg.body);
                        reply({ ok: true });
                        break;
                    case 'leaderboard': {
                        const res = await getTacticsForgerLeaderboard();
                        reply({ ok: true, data: res.data, username: user?.username });
                        break;
                    }
                }
            } catch (err) {
                reply({ ok: false, status: (err as AxiosError).response?.status ?? 0 });
            }
        };
        const listener = (event: MessageEvent) => void onMessage(event);
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, [user?.username]);

    return (
        <>
            <Box
                component='iframe'
                ref={frame}
                title='Dojo Tactics Forger'
                src={src}
                sx={{
                    display: 'block',
                    width: 1,
                    height: 'calc(100dvh - var(--navbar-height))',
                    border: 0,
                }}
            />
            {askGoal && <ForgerGoalDialog open onClose={() => setAskGoal(false)} />}
            {analysis && (
                <ForgerAnalysisDialog analysis={analysis} onClose={() => setAnalysis(null)} />
            )}
        </>
    );
}

/** How many puzzles an entry's notes say were solved ("Solved 34 puzzles ..."). */
function puzzlesIn(entry: TimelineEntry): number {
    return Number(/Solved (\d+) puzzle/.exec(entry.notes ?? '')?.[1] ?? 0);
}

/** "Solved 34 puzzles in the Dojo Tactics Forger". */
function forgerNotes(n: number): string {
    return `Solved ${n} puzzle${n === 1 ? '' : 's'} in the Dojo Tactics Forger`;
}
