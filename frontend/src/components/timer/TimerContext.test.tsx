import { useRequirement } from '@/api/cache/requirements';
import { AuthStatus } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import {
    CustomTask,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { RatingSystem, User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { use } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerContext, TimerContextProvider } from './TimerContext';

const apiUpdateUser = vi.fn();

const authState = vi.hoisted(() => ({
    user: null as User | null,
    status: 'Authenticated' as AuthStatus,
}));

const updateUserImpl = vi.hoisted(() =>
    vi.fn((partial: Partial<User>) => {
        if (authState.user) {
            authState.user = { ...authState.user, ...partial };
        }
    }),
);

vi.mock('@/api/Api', () => ({
    useApi: () => ({ updateUser: apiUpdateUser }),
}));

vi.mock('@/api/cache/requirements', () => ({
    useRequirement: vi.fn(() => ({ requirement: undefined })),
}));

vi.mock('@/auth/Auth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/auth/Auth')>();
    return {
        ...actual,
        useAuth: () => ({
            user: authState.user,
            status: authState.status,
            updateUser: updateUserImpl,
        }),
    };
});

function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'testuser',
        displayName: 'Test User',
        discordUsername: 'test',
        dojoCohort: '1000-1100',
        bio: '',
        ratingSystem: RatingSystem.Chesscom,
        ratings: {},
        progress: {},
        disableBookingNotifications: false,
        disableCancellationNotifications: false,
        isAdmin: false,
        isCalendarAdmin: false,
        isTournamentAdmin: false,
        isBetaTester: false,
        isCoach: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        numberOfGraduations: 0,
        previousCohort: '',
        lastGraduatedAt: '',
        enableLightMode: false,
        enableZenMode: false,
        timezoneOverride: '',
        timeFormat: '24h',
        hasCreatedProfile: true,
        followerCount: 0,
        followingCount: 0,
        referralSource: '',
        ...overrides,
    } as User;
}

function TimerConsumer({ taskId }: { taskId?: string }) {
    const timer = use(TimerContext);
    const taskName =
        timer.task && 'shortName' in timer.task
            ? timer.task.shortName || timer.task.name
            : timer.task?.name;
    return (
        <div>
            <span data-testid='seconds'>{timer.timerSeconds}</span>
            <span data-testid='isRunning'>{String(timer.isRunning)}</span>
            <span data-testid='isPaused'>{String(timer.isPaused)}</span>
            <span data-testid='taskName'>{taskName ?? ''}</span>
            <span data-testid='label'>{timer.getLabel(taskId)}</span>
            <button type='button' data-testid='start' onClick={() => timer.onStart(taskId)}>
                Start
            </button>
            <button type='button' data-testid='pause' onClick={() => timer.onPause(taskId)}>
                Pause
            </button>
            <button type='button' data-testid='clear' onClick={() => timer.onClear()}>
                Clear
            </button>
            <button type='button' data-testid='toggle' onClick={() => timer.onToggle(taskId)}>
                Toggle
            </button>
        </div>
    );
}

function renderTimer(taskId?: string) {
    return render(
        <TimerContextProvider>
            <TimerConsumer taskId={taskId} />
        </TimerContextProvider>,
    );
}

describe('TimerContextProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-27T12:00:00Z'));
        document.title = 'ChessDojo';
        authState.user = makeUser();
        authState.status = AuthStatus.Authenticated;
        apiUpdateUser.mockReset();
        updateUserImpl.mockClear();
        vi.mocked(useRequirement).mockReturnValue({ requirement: undefined } as ReturnType<
            typeof useRequirement
        >);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        document.title = 'ChessDojo';
    });

    it('renders children without a provider while auth is loading', () => {
        authState.status = AuthStatus.Loading;
        render(
            <TimerContextProvider>
                <div data-testid='child'>child</div>
            </TimerContextProvider>,
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders children without a provider when there is no user', () => {
        authState.user = null;
        render(
            <TimerContextProvider>
                <div data-testid='child'>child</div>
            </TimerContextProvider>,
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('initializes elapsed seconds from timerStartedAt', () => {
        const startedAt = new Date('2026-05-27T11:59:30Z').toISOString();
        authState.user = makeUser({ timerSeconds: 60, timerStartedAt: startedAt });
        renderTimer();
        expect(screen.getByTestId('seconds')).toHaveTextContent('90');
        expect(screen.getByTestId('isRunning')).toHaveTextContent('true');
    });

    it('reports paused when timer seconds exist but the timer is not running', () => {
        authState.user = makeUser({ timerSeconds: 45, timerStartedAt: '' });
        renderTimer();
        expect(screen.getByTestId('seconds')).toHaveTextContent('45');
        expect(screen.getByTestId('isPaused')).toHaveTextContent('true');
        expect(screen.getByTestId('isRunning')).toHaveTextContent('false');
    });

    it('returns Start Timer label when idle', () => {
        renderTimer();
        expect(screen.getByTestId('label')).toHaveTextContent('Start Timer');
    });

    it('returns Pause Timer label while running', () => {
        const startedAt = new Date('2026-05-27T11:59:00Z').toISOString();
        authState.user = makeUser({ timerSeconds: 0, timerStartedAt: startedAt });
        renderTimer();
        expect(screen.getByTestId('label')).toHaveTextContent(`Pause Timer (${formatTime(60)})`);
    });

    it('returns Resume Timer label when paused', () => {
        authState.user = makeUser({ timerSeconds: 125, timerStartedAt: '' });
        renderTimer();
        expect(screen.getByTestId('label')).toHaveTextContent(`Resume Timer (${formatTime(125)})`);
    });

    it('returns Clear and Restart Timer for a different task', () => {
        authState.user = makeUser({
            timerTaskId: 'task-a',
            timerSeconds: 30,
            timerStartedAt: new Date('2026-05-27T11:59:00Z').toISOString(),
        });
        renderTimer('task-b');
        expect(screen.getByTestId('label')).toHaveTextContent('Clear and Restart Timer');
    });

    it('starts the timer and persists to the API', () => {
        renderTimer();
        fireEvent.click(screen.getByTestId('start'));

        expect(screen.getByTestId('isRunning')).toHaveTextContent('true');
        expect(updateUserImpl).toHaveBeenCalledWith(
            expect.objectContaining({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                timerStartedAt: expect.any(String),
            }),
        );
        expect(apiUpdateUser).toHaveBeenCalledWith(
            expect.objectContaining({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                timerStartedAt: expect.any(String),
            }),
        );
    });

    it('resets elapsed seconds when starting a different task', () => {
        authState.user = makeUser({
            timerTaskId: 'task-a',
            timerSeconds: 120,
            timerStartedAt: '',
        });
        renderTimer('task-b');
        fireEvent.click(screen.getByTestId('start'));

        expect(screen.getByTestId('seconds')).toHaveTextContent('0');
        expect(updateUserImpl).toHaveBeenCalledWith(
            expect.objectContaining({ timerSeconds: 0, timerTaskId: 'task-b' }),
        );
        expect(apiUpdateUser).toHaveBeenCalledWith(
            expect.objectContaining({ timerSeconds: 0, timerTaskId: 'task-b' }),
        );
    });

    it('pauses the timer and saves elapsed seconds', () => {
        const startedAt = new Date('2026-05-27T11:59:00Z').toISOString();
        authState.user = makeUser({
            timerSeconds: 0,
            timerStartedAt: startedAt,
            timerTaskId: 'task-a',
        });
        renderTimer();
        fireEvent.click(screen.getByTestId('pause'));

        expect(screen.getByTestId('isRunning')).toHaveTextContent('false');
        expect(updateUserImpl).toHaveBeenCalledWith(
            expect.objectContaining({
                timerSeconds: 60,
                timerStartedAt: '',
                timerTaskId: 'task-a',
            }),
        );
        expect(apiUpdateUser).toHaveBeenCalledWith(
            expect.objectContaining({
                timerSeconds: 60,
                timerStartedAt: '',
                timerTaskId: undefined,
            }),
        );
    });

    it('clears the timer', () => {
        authState.user = makeUser({ timerSeconds: 90, timerStartedAt: '' });
        renderTimer();
        fireEvent.click(screen.getByTestId('clear'));

        expect(screen.getByTestId('seconds')).toHaveTextContent('0');
        expect(screen.getByTestId('isRunning')).toHaveTextContent('false');
        expect(updateUserImpl).toHaveBeenCalledWith({
            timerSeconds: 0,
            timerStartedAt: '',
            timerTaskId: '',
        });
        expect(apiUpdateUser).toHaveBeenCalledWith({
            timerSeconds: 0,
            timerStartedAt: '',
            timerTaskId: '',
        });
    });

    it('toggles pause when the same task is running', () => {
        const startedAt = new Date('2026-05-27T11:59:00Z').toISOString();
        authState.user = makeUser({ timerTaskId: 'task-a', timerStartedAt: startedAt });
        renderTimer('task-a');
        fireEvent.click(screen.getByTestId('toggle'));

        expect(screen.getByTestId('isRunning')).toHaveTextContent('false');
        expect(updateUserImpl).toHaveBeenCalledWith(
            expect.objectContaining({ timerSeconds: 60, timerStartedAt: '' }),
        );
    });

    it('toggles start when the timer is not running', () => {
        authState.user = makeUser({ timerTaskId: 'task-a', timerSeconds: 10, timerStartedAt: '' });
        renderTimer('task-a');
        fireEvent.click(screen.getByTestId('toggle'));

        expect(screen.getByTestId('isRunning')).toHaveTextContent('true');
        expect(updateUserImpl).toHaveBeenCalledWith(
            expect.objectContaining({
                timerStartedAt: '2026-05-27T12:00:00.000Z',
                timerTaskId: 'task-a',
            }),
        );
    });

    it('ticks every second while running', () => {
        const startedAt = new Date('2026-05-27T11:59:00Z').toISOString();
        authState.user = makeUser({ timerSeconds: 0, timerStartedAt: startedAt });
        renderTimer();
        expect(screen.getByTestId('seconds')).toHaveTextContent('60');

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByTestId('seconds')).toHaveTextContent('61');
    });

    it('updates document title while running and restores it when stopped', () => {
        const startedAt = new Date('2026-05-27T11:59:00Z').toISOString();
        authState.user = makeUser({ timerSeconds: 0, timerStartedAt: startedAt });
        renderTimer();

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        const seconds = Number(screen.getByTestId('seconds').textContent);
        expect(document.title).toBe(`${formatTime(seconds)} - ChessDojo`);

        fireEvent.click(screen.getByTestId('pause'));
        expect(document.title).toBe('ChessDojo');
    });

    it('exposes a custom task from the user', () => {
        const customTask: Partial<CustomTask> = {
            id: 'custom-1',
            name: 'My Custom Task',
            updatedAt: '2024-01-01T00:00:00Z',
        };
        authState.user = makeUser({
            timerTaskId: 'custom-1',
            customTasks: [customTask as CustomTask],
        });
        renderTimer();
        expect(screen.getByTestId('taskName')).toHaveTextContent('My Custom Task');
    });

    it('exposes a requirement task when timerTaskId matches', () => {
        const requirement: Partial<Requirement> = {
            id: 'req-1',
            status: RequirementStatus.Active,
            category: RequirementCategory.Tactics,
            name: 'Full Requirement Name',
            shortName: 'Short Req',
            dailyName: 'Daily',
            description: '',
            freeDescription: '',
            counts: {},
            startCount: 0,
            numberOfCohorts: 1,
            unitScore: 0,
            totalScore: 0,
            scoreboardDisplay: ScoreboardDisplay.Hidden,
            updatedAt: '2024-01-01T00:00:00Z',
            sortPriority: '1',
            isFree: false,
            atomic: false,
        };
        vi.mocked(useRequirement).mockReturnValue({ requirement } as ReturnType<
            typeof useRequirement
        >);
        authState.user = makeUser({ timerTaskId: 'req-1' });
        renderTimer();
        expect(screen.getByTestId('taskName')).toHaveTextContent('Short Req');
    });
});
