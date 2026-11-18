import { Timer, TimerContext } from '@/components/timer/TimerContext';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COHORT, makeTask } from './__fixtures__/tasks';
import { TaskDialog, TaskDialogView } from './TaskDialog';

const mocks = vi.hoisted(() => ({
    user: { username: 'viewer', dojoCohort: '1400-1500', progress: {} },
    owner: 'viewer',
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: mocks.user }),
    useFreeTier: () => false,
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => ({
        owner: mocks.owner,
        entries: [],
        onNewEntry: vi.fn(),
        request: { isLoading: () => false },
    }),
}));

vi.mock('@/api/cache/requirements', () => ({
    useRequirements: () => ({ requirements: [], request: { isLoading: () => false } }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({ updateUserProgress: vi.fn() }),
}));

vi.mock('@mui/x-date-pickers-pro', () => ({
    DateTimePicker: () => <input aria-label='Date' readOnly />,
}));

const task = makeTask({ id: 'polgar', name: 'Solve Polgar M2s' });

const timer: Timer = {
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
};

function renderDialog(initialView: TaskDialogView, onClose = vi.fn()) {
    return renderWithIntl(
        <TimerContext value={timer}>
            <TaskDialog
                open
                onClose={onClose}
                task={task}
                initialView={initialView}
                progress={undefined}
                cohort={COHORT}
            />
        </TimerContext>,
    );
}

describe('TaskDialog', () => {
    afterEach(() => {
        cleanup();
        mocks.owner = 'viewer';
    });

    it('shows the progress form for the owner', () => {
        renderDialog(TaskDialogView.Progress);
        expect(screen.getByTestId('task-updater-save-button')).toBeInTheDocument();
    });

    it('lets the owner switch from details to logging', () => {
        renderDialog(TaskDialogView.Details);
        fireEvent.click(screen.getByTestId('task-dialog-progress-button'));
        expect(screen.getByTestId('task-updater-save-button')).toBeInTheDocument();
    });

    it('opens details instead of the progress form on another member’s profile', () => {
        mocks.owner = 'someone-else';
        renderDialog(TaskDialogView.Progress);

        expect(screen.getByText('Solve Polgar M2s')).toBeInTheDocument();
        expect(screen.queryByTestId('task-updater-save-button')).not.toBeInTheDocument();
    });

    it('hides logging actions in the details view on another member’s profile', () => {
        mocks.owner = 'someone-else';
        renderDialog(TaskDialogView.Details);

        expect(screen.queryByRole('button', { name: 'Log Training' })).not.toBeInTheDocument();
        expect(screen.queryByTestId('task-dialog-progress-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('task-updater-show-history-button')).not.toBeInTheDocument();
        expect(screen.queryByText('Start Timer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('task-updater-save-button')).not.toBeInTheDocument();
    });

    it('closes read-only task details from the header', () => {
        mocks.owner = 'someone-else';
        const onClose = vi.fn();
        renderDialog(TaskDialogView.Details, onClose);

        expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledOnce();
    });
});
