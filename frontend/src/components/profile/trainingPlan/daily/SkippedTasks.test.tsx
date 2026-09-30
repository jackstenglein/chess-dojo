import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/en.json';
import { COHORT, makeTask } from '../__fixtures__/tasks';
import { CLASSICAL_GAMES_TASK_ID, SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { UseWeeklyTrainingPlanResponse } from '../useTrainingPlan';
import { SkippedTasksRow, SkipUndoSnackbar } from './SkippedTasks';

const polgar = makeTask({ id: 'polgar', name: 'Solve Polgar M2s' });

function renderWithPlan(ui: React.ReactNode, plan: Partial<UseWeeklyTrainingPlanResponse>) {
    const value = {
        user: { dojoCohort: COHORT, customTasks: [] },
        allRequirements: [polgar],
        isCurrentUser: true,
        skippedTaskIds: [],
        toggleSkip: vi.fn(),
        undoSkip: vi.fn(),
        clearLastSkipped: vi.fn(),
        ...plan,
    } as unknown as UseWeeklyTrainingPlanResponse;
    render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <TrainingPlanContext value={value}>{ui}</TrainingPlanContext>
        </NextIntlClientProvider>,
    );
    return value;
}

describe('SkippedTasksRow', () => {
    afterEach(cleanup);

    it('is hidden when nothing is skipped', () => {
        renderWithPlan(<SkippedTasksRow />, {});
        expect(screen.queryByTestId('skipped-tasks')).not.toBeInTheDocument();
    });

    it('is hidden on another member’s profile', () => {
        renderWithPlan(<SkippedTasksRow />, { skippedTaskIds: ['polgar'], isCurrentUser: false });
        expect(screen.queryByTestId('skipped-tasks')).not.toBeInTheDocument();
    });

    it('lists skipped tasks and restores one when its chip is clicked', () => {
        const plan = renderWithPlan(<SkippedTasksRow />, { skippedTaskIds: ['polgar'] });
        expect(screen.getByText('Skipped this week (1)')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('skipped-tasks-toggle'));
        fireEvent.click(screen.getByText('Solve Polgar M2s'));
        expect(plan.toggleSkip).toHaveBeenCalledWith('polgar');
    });

    it('restores the schedule-a-game card and classical games together', () => {
        const plan = renderWithPlan(<SkippedTasksRow />, {
            skippedTaskIds: [SCHEDULE_CLASSICAL_GAME_TASK_ID, CLASSICAL_GAMES_TASK_ID],
        });
        expect(screen.getByText('Skipped this week (1)')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('skipped-tasks-toggle'));
        fireEvent.click(screen.getByText('Schedule Your Next Classical Game'));
        expect(plan.toggleSkip).toHaveBeenCalledWith(
            SCHEDULE_CLASSICAL_GAME_TASK_ID,
            CLASSICAL_GAMES_TASK_ID,
        );
    });

    it('leaves out ids that no longer match a task', () => {
        renderWithPlan(<SkippedTasksRow />, { skippedTaskIds: ['deleted-custom-task'] });
        expect(screen.queryByTestId('skipped-tasks')).not.toBeInTheDocument();
    });
});

describe('SkipUndoSnackbar', () => {
    afterEach(cleanup);

    it('names the skipped task and undoes the skip', () => {
        const plan = renderWithPlan(<SkipUndoSnackbar />, { lastSkipped: ['polgar'] });
        expect(
            screen.getByText('Skipped Solve Polgar M2s for the rest of the week'),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('skip-undo'));
        expect(plan.undoSkip).toHaveBeenCalled();
    });
});
