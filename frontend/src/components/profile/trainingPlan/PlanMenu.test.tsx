import { useApi } from '@/api/Api';
import { User } from '@/database/user';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/en.json';
import { PlanMenu, TrainingPlanSections } from './PlanMenu';

vi.mock('@/api/Api', () => ({ useApi: vi.fn(() => ({})) }));

const user = { username: 'me', weekStart: 0 } as unknown as User;

function Harness({ isCurrentUser }: { isCurrentUser: boolean }) {
    const [showToday, setShowToday] = useState(true);
    const [showWeek, setShowWeek] = useState(true);
    const sections: TrainingPlanSections = { showToday, setShowToday, showWeek, setShowWeek };
    return (
        <NextIntlClientProvider locale='en' messages={messages}>
            <PlanMenu user={user} isCurrentUser={isCurrentUser} sections={sections} />
            <span data-testid='state'>{`${showToday}-${showWeek}`}</span>
        </NextIntlClientProvider>
    );
}

function openMenu() {
    fireEvent.click(screen.getByTestId('plan-menu-button'));
}

describe('PlanMenu', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('shows a labelled options button', () => {
        render(<Harness isCurrentUser />);
        const button = screen.getByLabelText('Training plan options');
        expect(button.textContent).toContain('Plan');
        expect(button.querySelector('title')?.textContent).toBe('ChessDojo');
    });

    it("toggles the Today's Tasks and Weekly Goal sections", () => {
        render(<Harness isCurrentUser />);
        openMenu();

        fireEvent.click(screen.getByTestId('plan-menu-show-today'));
        expect(screen.getByTestId('state').textContent).toBe('false-true');

        fireEvent.click(screen.getByTestId('plan-menu-show-week'));
        expect(screen.getByTestId('state').textContent).toBe('false-false');

        fireEvent.click(screen.getByTestId('plan-menu-show-today'));
        expect(screen.getByTestId('state').textContent).toBe('true-false');
    });

    it('opens the work goal dialog', () => {
        render(<Harness isCurrentUser />);
        openMenu();
        expect(screen.getByTestId('plan-menu-work-goal').textContent).toContain('Set Weekly Goal');
        fireEvent.click(screen.getByTestId('plan-menu-work-goal'));
        expect(screen.getByLabelText('Start Week On')).toBeInTheDocument();
    });

    it('opens the reset progress confirmation', () => {
        render(<Harness isCurrentUser />);
        openMenu();
        fireEvent.click(screen.getByTestId('plan-menu-reset'));
        expect(screen.getByText('Reset Training Plan Progress?')).toBeInTheDocument();
        expect(screen.getByTestId('reset-progress-confirm-button')).toBeDisabled();
        expect(vi.mocked(useApi)).toHaveBeenCalled();
    });

    it('only shows the view options on someone else’s plan', () => {
        render(<Harness isCurrentUser={false} />);
        openMenu();
        expect(screen.getByTestId('plan-menu-show-today')).toBeInTheDocument();
        expect(screen.queryByTestId('plan-menu-work-goal')).toBeNull();
        expect(screen.queryByTestId('plan-menu-reset')).toBeNull();
    });

    it('picks a bar color, with multicolor as the default', () => {
        localStorage.removeItem('training-plan-bar-color');
        render(<Harness isCurrentUser />);
        openMenu();

        expect(screen.getByTestId('bar-color-multicolor')).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByTestId('bar-color-purple'));
        expect(screen.getByTestId('bar-color-purple')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('bar-color-multicolor')).toHaveAttribute('aria-checked', 'false');
        expect(localStorage.getItem('training-plan-bar-color')).toBe('"purple"');
        localStorage.removeItem('training-plan-bar-color');
    });

    it('leads with Set Weekly Goal and its total, and ends with Reset progress', () => {
        render(<Harness isCurrentUser />);
        openMenu();

        const items = screen.getAllByRole('menuitem').map((item) => item.dataset.testid);
        expect(items[0]).toBe('plan-menu-work-goal');
        expect(items.at(-1)).toBe('plan-menu-reset');
        // No saved goal, so the default of an hour a day.
        expect(screen.getByTestId('plan-menu-work-goal-total').textContent).toBe('7h');
    });
});
