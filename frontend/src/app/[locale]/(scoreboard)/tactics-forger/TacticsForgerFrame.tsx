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
          body: { minutes: number; puzzles: number };
      };

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

/** This visit's timeline entry for the task: it grows as more minutes come in. */
interface ForgerVisit {
    entry: TimelineEntry;
    progress: RequirementProgress;
    day: string;
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

    /**
     * Adds minutes to the Forger task: adds the task the first time, starts one timeline entry per
     * visit (and day), then grows it. Entries are saved as a normal task's, not a custom one's, so
     * the time shows like any other training on the activity heatmap.
     */
    const logTime = async (minutes: number, puzzles: number) => {
        const { user: u, api: a } = latest.current;
        if (!u || minutes < 1) throw new Error('not signed in');
        if (!u.customTasks?.some((t) => t.id === TACTICS_FORGER_TASK_ID)) {
            await a.updateUser({ customTasks: [...(u.customTasks ?? []), forgerTask(u.username)] });
            setAskGoal(true);
        }
        const cohort = u.dojoCohort;
        const today = new Date().toDateString();
        const v = visit.current;
        if (v?.day === today) {
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
                notes: forgerNotes(v.entry, puzzles),
                isCustomRequirement: false,
            };
            await a.updateUserTimeline({
                requirementId: TACTICS_FORGER_TASK_ID,
                progress,
                updated: [entry],
                deleted: [],
            });
            visit.current = { entry, progress, day: today };
            return;
        }
        const before = u.progress?.[TACTICS_FORGER_TASK_ID]?.counts?.[ALL_COHORTS] ?? 0;
        const res = await a.updateUserProgress({
            requirementId: TACTICS_FORGER_TASK_ID,
            cohort,
            previousCount: before,
            newCount: before + minutes,
            incrementalMinutesSpent: minutes,
            date: null,
            notes: forgerNotes(undefined, puzzles),
        });
        const entry: TimelineEntry = { ...res.data.timelineEntry, isCustomRequirement: false };
        const progress = res.data.user.progress[TACTICS_FORGER_TASK_ID];
        await a.updateUserTimeline({
            requirementId: TACTICS_FORGER_TASK_ID,
            progress,
            updated: [entry],
            deleted: [],
        });
        visit.current = { entry, progress, day: today };
    };

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
                        await logTime(Math.round(msg.body.minutes), msg.body.puzzles);
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

/** "Solved 34 puzzles in the Dojo Tactics Forger", counting up over the visit. */
function forgerNotes(entry: TimelineEntry | undefined, puzzles: number): string {
    const before = Number(/Solved (\d+) puzzle/.exec(entry?.notes ?? '')?.[1] ?? 0);
    const n = before + puzzles;
    return `Solved ${n} puzzle${n === 1 ? '' : 's'} in the Dojo Tactics Forger`;
}
