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
});
