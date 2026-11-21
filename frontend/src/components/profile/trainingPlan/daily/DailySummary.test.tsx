import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../../../messages/en.json';
import { DailySummary } from './DailyTrainingPlan';

function renderSummary(props: React.ComponentProps<typeof DailySummary>) {
    render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <DailySummary {...props} />
        </NextIntlClientProvider>,
    );
    return screen.getByTestId('daily-summary');
}

describe('DailySummary', () => {
    afterEach(cleanup);

    it('marks the time goal as met when time is logged but tasks remain', () => {
        const summary = renderSummary({
            taskCount: 3,
            doneCount: 1,
            goalMinutes: 60,
            workedMinutes: 150,
        });
        expect(screen.getByTestId('daily-goal-met').textContent).toContain('Time goal met');
        expect(summary.querySelector('.MuiLinearProgress-colorSuccess')).not.toBeNull();
    });

    it('stays neutral before the goal is met', () => {
        const summary = renderSummary({
            taskCount: 3,
            doneCount: 1,
            goalMinutes: 60,
            workedMinutes: 30,
        });
        expect(screen.queryByTestId('daily-goal-met')).toBeNull();
        expect(summary.querySelector('.MuiLinearProgress-colorPrimary')).not.toBeNull();
    });

    it('shows the finished state once every task is done', () => {
        renderSummary({ taskCount: 3, doneCount: 3, goalMinutes: 60, workedMinutes: 60 });
        expect(screen.getByText(/Done for today/)).toBeTruthy();
        expect(screen.queryByTestId('daily-goal-met')).toBeNull();
    });

    it('measures progress against the day goal and shows pinned time over it', () => {
        renderSummary({
            taskCount: 2,
            doneCount: 0,
            goalMinutes: 60,
            plannedMinutes: 120,
            workedMinutes: 30,
        });
        expect(screen.getByTestId('daily-summary').textContent).toContain('30m of 1h');
        expect(screen.getByTestId('daily-planned-over-goal').textContent).toBe('2h planned');
    });

    it('marks the day goal met even when pinned tasks planned more', () => {
        renderSummary({
            taskCount: 2,
            doneCount: 0,
            goalMinutes: 60,
            plannedMinutes: 120,
            workedMinutes: 60,
        });
        expect(screen.getByTestId('daily-goal-met')).not.toBeNull();
        expect(screen.queryByTestId('daily-planned-over-goal')).toBeNull();
    });
});
