import { User } from '@/database/user';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/en.json';
import { getBarColor, getProgressColor } from './barColor';
import { SectionHeader } from './SectionHeader';
import { TrainingPlanContext } from './TrainingPlanTab';
import { UseWeeklyTrainingPlanResponse } from './useTrainingPlan';
import { getWeeklyGoalMinutes } from './workGoal';

vi.mock('@/api/Api', () => ({ useApi: vi.fn(() => ({})) }));

function renderHeader({
    isCurrentUser = true,
    expanded = true,
    goal = 60,
    worked = 30,
    onToggle = vi.fn(),
}: {
    isCurrentUser?: boolean;
    expanded?: boolean;
    goal?: number;
    worked?: number;
    onToggle?: () => void;
} = {}) {
    const context = {
        user: { username: 'me', weekStart: 0 } as unknown as User,
        isCurrentUser,
    } as unknown as UseWeeklyTrainingPlanResponse;
    render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <TrainingPlanContext value={context}>
                <SectionHeader
                    title='Today'
                    expanded={expanded}
                    onToggle={onToggle}
                    goal={goal}
                    worked={worked}
                    testId='today'
                />
            </TrainingPlanContext>
        </NextIntlClientProvider>,
    );
    return { onToggle };
}

describe('getWeeklyGoalMinutes', () => {
    it('adds up every day of the work goal', () => {
        expect(getWeeklyGoalMinutes({ minutesPerDay: [0, 60, 60, 60, 60, 60, 120] })).toBe(420);
    });

    it('uses the default of an hour a day', () => {
        expect(getWeeklyGoalMinutes(undefined)).toBe(420);
    });
});

describe('getProgressColor', () => {
    it('goes from orange through yellow to bright green', () => {
        expect(getProgressColor(0)).toBe('rgb(247, 148, 31)');
        expect(getProgressColor(25)).toBe('rgb(246, 180, 47)');
        expect(getProgressColor(50)).toBe('rgb(245, 211, 63)');
        expect(getProgressColor(100)).toBe('rgb(76, 224, 106)');
    });

    it('uses a single color when one is picked', () => {
        expect(getBarColor(10, 'purple')).toBe('#9575cd');
        expect(getBarColor(100, 'purple')).toBe('#9575cd');
        expect(getBarColor(50, 'multicolor')).toBe(getProgressColor(50));
    });

    it('clamps out-of-range percents', () => {
        expect(getProgressColor(-10)).toBe('rgb(247, 148, 31)');
        expect(getProgressColor(150)).toBe('rgb(76, 224, 106)');
    });
});

describe('SectionHeader', () => {
    afterEach(cleanup);

    it('shows the title and the time against the goal', () => {
        renderHeader({ goal: 90, worked: 15 });
        expect(screen.getByTestId('today-title').textContent).toBe('Today');
        expect(screen.getByText('15m / 1h 30m')).toBeInTheDocument();
        expect(screen.getByTestId('today-goal')).toHaveAttribute(
            'aria-label',
            'Set Weekly Goal: 15m / 1h 30m',
        );
    });

    it('toggles the section when the chevron is clicked', () => {
        const { onToggle } = renderHeader();
        fireEvent.click(screen.getByTestId('today-toggle'));
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('today-toggle')).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens the weekly goal editor when the bar is clicked', () => {
        renderHeader();
        fireEvent.click(screen.getByTestId('today-goal'));
        expect(screen.getByLabelText('Start Week On')).toBeInTheDocument();
    });

    it('does not let others edit the goal', () => {
        renderHeader({ isCurrentUser: false });
        expect(screen.queryByTestId('today-goal')).toBeNull();
        expect(screen.getByText('30m / 1h')).toBeInTheDocument();
    });

    it('shows a hidden section as collapsed', () => {
        renderHeader({ expanded: false });
        expect(screen.getByTestId('today-toggle')).toHaveAttribute('aria-expanded', 'false');
    });
});
