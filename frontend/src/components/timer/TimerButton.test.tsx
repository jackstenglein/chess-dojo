import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import {
    CustomTask,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimerButton } from './TimerButton';
import { Timer, TimerContext } from './TimerContext';

const authState: { user?: { username: string; dojoCohort: string } } = vi.hoisted(() => ({
    user: { username: 'testuser', dojoCohort: '1000-1100' },
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: authState.user }),
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    TimelineProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/profile/trainingPlan/TaskDialog', () => ({
    TaskDialog: () => null,
    TaskDialogView: { Progress: 'Progress' },
}));

function createTimer(overrides: Partial<Timer> = {}): Timer {
    return {
        timerSeconds: 0,
        isRunning: false,
        isPaused: false,
        showTask: false,
        setShowTask: vi.fn(),
        onStart: vi.fn(),
        onPause: vi.fn(),
        onToggle: vi.fn(),
        onClear: vi.fn(),
        getLabel: () => 'Start Timer',
        ...overrides,
    };
}

function renderTimerButton(timer: Partial<Timer> = {}) {
    const value = createTimer(timer);
    return {
        ...renderWithIntl(
            <TimerContext.Provider value={value}>
                <TimerButton />
            </TimerContext.Provider>,
        ),
        timer: value,
    };
}

const testRequirement: Partial<Requirement> = {
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

const testCustomTask: Partial<CustomTask> = {
    id: 'custom-1',
    name: 'Custom Task',
    updatedAt: '2024-01-01T00:00:00Z',
};

describe('TimerButton', () => {
    afterEach(cleanup);

    it('renders nothing when there is no user', () => {
        authState.user = undefined;
        const { container } = renderWithIntl(
            <TimerContext.Provider value={createTimer()}>
                <TimerButton />
            </TimerContext.Provider>,
        );
        expect(container).toBeEmptyDOMElement();
        authState.user = { username: 'testuser', dojoCohort: '1000-1100' };
    });

    it('renders the timer icon button', () => {
        renderTimerButton();
        expect(screen.getByTestId('Timer')).toBeInTheDocument();
    });

    it('opens the menu with work timer label when there is no task', () => {
        renderTimerButton({ timerSeconds: 90 });
        fireEvent.click(screen.getByTestId('Timer'));

        expect(screen.getByText('Work Timer')).toBeInTheDocument();
        expect(screen.getByText(formatTime(90))).toBeInTheDocument();
    });

    it('shows the requirement short name in the menu', () => {
        renderTimerButton({ timerSeconds: 30, task: testRequirement as Requirement });
        fireEvent.click(screen.getByTestId('Timer'));
        expect(screen.getByText('Short Req')).toBeInTheDocument();
    });

    it('shows the custom task name in the menu', () => {
        renderTimerButton({ timerSeconds: 30, task: testCustomTask as CustomTask });
        fireEvent.click(screen.getByTestId('Timer'));
        expect(screen.getByText('Custom Task')).toBeInTheDocument();
    });

    it('shows Start when the timer is not running', () => {
        const { timer } = renderTimerButton({ isRunning: false });
        fireEvent.click(screen.getByTestId('Timer'));

        fireEvent.click(screen.getByRole('button', { name: /start/i }));
        expect(timer.onStart).toHaveBeenCalled();
    });

    it('shows Pause when the timer is running', () => {
        const { timer } = renderTimerButton({ isRunning: true, timerSeconds: 45 });
        fireEvent.click(screen.getByTestId('Timer'));

        fireEvent.click(screen.getByRole('button', { name: /pause/i }));
        expect(timer.onPause).toHaveBeenCalledWith(undefined, true);
    });

    it('shows Reset only when paused', () => {
        renderTimerButton({ isPaused: true, timerSeconds: 30 });
        fireEvent.click(screen.getByTestId('Timer'));
        expect(screen.getByText('Reset')).toBeVisible();
    });

    it('hides Reset when not paused', () => {
        renderTimerButton({ isPaused: false, isRunning: true });
        fireEvent.click(screen.getByTestId('Timer'));
        expect(screen.getByText('Reset')).not.toBeVisible();
    });

    it('calls onClear when Reset is clicked', () => {
        const { timer } = renderTimerButton({ isPaused: true, timerSeconds: 30 });
        fireEvent.click(screen.getByTestId('Timer'));
        fireEvent.click(screen.getByText('Reset'));
        expect(timer.onClear).toHaveBeenCalled();
    });
});
