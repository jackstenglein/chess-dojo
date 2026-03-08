'use client';

import { useApi } from '@/api/Api';
import { useRequirement } from '@/api/cache/requirements';
import { useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { CustomTask, Requirement } from '@/database/requirement';
import { User } from '@/database/user';
import { createContext, ReactNode, useEffect, useState } from 'react';

/** Regex which matches the timer in the title of the page */
const TIMER_TITLE_REGEX = /^[\d:]+ - /;

/** The details of the work timer. */
export interface Timer {
    timerSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
    task?: Requirement | CustomTask;
    showTask: boolean;
    setShowTask: (v: boolean) => void;
    onStart: (taskId?: string) => void;
    onPause: (taskId?: string, showDialog?: boolean) => void;
    onToggle: (taskId?: string) => void;
    onClear: () => void;
    getLabel: (taskId?: string) => string;
}

export const TimerContext = createContext<Timer>(null as unknown as Timer);

/**
 * Renders a provider for the timer context to allow syncing timer details
 * between different components.
 */
export function TimerContextProvider({ children }: { children: ReactNode }) {
    const { user, updateUser } = useAuth();
    const api = useApi();
    const [timerSeconds, setTimerSeconds] = useState(() => getTimerSeconds(user));
    const [showTask, setShowTask] = useState(false);
    const { requirement } = useRequirement(user?.timerTaskId);
    const customTask = user?.customTasks?.find((t) => t.id === user.timerTaskId);

    const [isRunning, setIsRunning] = useState(Boolean(user?.timerStartedAt));
    const isPaused = !isRunning && Boolean(user?.timerSeconds);

    useEffect(() => {
        if (isRunning) {
            const id = setInterval(() => {
                const seconds = getTimerSeconds(user);
                setTimerSeconds(seconds);
                document.title =
                    formatTime(seconds) + ` - ` + document.title.replace(TIMER_TITLE_REGEX, '');
            }, 1000);
            return () => clearInterval(id);
        } else {
            document.title = document.title.replace(TIMER_TITLE_REGEX, '');
        }
    }, [isRunning, setTimerSeconds, user]);

    const onStart = (taskId?: string) => {
        const timerStartedAt = new Date().toISOString();
        const update: Partial<User> = { timerStartedAt, timerTaskId: taskId || user?.timerTaskId };

        if (user?.timerTaskId && taskId && user.timerTaskId !== taskId) {
            update.timerSeconds = 0;
            setTimerSeconds(0);
        }

        setIsRunning(true);
        updateUser(update);
        void api.updateUser(update);
    };

    const onPause = (taskId?: string, openDialog?: boolean) => {
        const timerSeconds = getTimerSeconds(user);
        setIsRunning(false);
        updateUser({ timerSeconds, timerStartedAt: '', timerTaskId: taskId || user?.timerTaskId });
        void api.updateUser({ timerSeconds, timerStartedAt: '', timerTaskId: taskId });
        if (openDialog && (customTask || requirement)) {
            setShowTask(true);
        }
    };

    const onClear = () => {
        setIsRunning(false);
        updateUser({ timerSeconds: 0, timerStartedAt: '', timerTaskId: '' });
        void api.updateUser({ timerSeconds: 0, timerStartedAt: '', timerTaskId: '' });
        setTimerSeconds(0);
    };

    const getLabel = (taskId?: string) => {
        if (!user?.timerTaskId || taskId === user?.timerTaskId) {
            if (isRunning) {
                return `Pause Timer (${formatTime(timerSeconds)})`;
            }
            if (user?.timerSeconds) {
                return `Resume Timer (${formatTime(timerSeconds)})`;
            }
            return 'Start Timer';
        }

        return `Clear and Restart Timer`;
    };

    const onToggle = (taskId?: string) => {
        if ((!user?.timerTaskId || taskId === user?.timerTaskId) && isRunning) {
            onPause(taskId, true);
        } else {
            onStart(taskId);
        }
    };

    return (
        <TimerContext
            value={{
                timerSeconds,
                isRunning,
                isPaused,
                task: customTask || requirement,
                showTask,
                setShowTask,
                onStart,
                onPause,
                onClear,
                getLabel,
                onToggle,
            }}
        >
            {children}
        </TimerContext>
    );
}

/**
 * Returns the number of seconds on the given user's work timer.
 * @param user The user to get the work timer for.
 * @returns The number of seconds on the user's work timer.
 */
function getTimerSeconds(user: User | undefined): number {
    let timerSeconds = user?.timerSeconds ?? 0;
    if (user?.timerStartedAt) {
        const now = Date.now();
        const startedAt = new Date(user.timerStartedAt).getTime();
        timerSeconds += (now - startedAt) / 1000;
    }
    return Math.floor(timerSeconds);
}
