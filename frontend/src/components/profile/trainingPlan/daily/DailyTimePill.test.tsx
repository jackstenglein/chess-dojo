import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../../../messages/en.json';
import { DailyTimePill } from './DailyCard';

function renderPill(props: React.ComponentProps<typeof DailyTimePill>) {
    render(
        <NextIntlClientProvider locale='en' messages={messages}>
            <DailyTimePill {...props} />
        </NextIntlClientProvider>,
    );
}

describe('DailyTimePill', () => {
    afterEach(cleanup);

    it('fills halfway at 15m of 30m, without a check', () => {
        renderPill({ worked: 15, goal: 30, done: false });
        expect(getComputedStyle(screen.getByTestId('daily-time-pill-fill')).width).toBe('50%');
        expect(screen.queryByTestId('CheckIcon')).toBeNull();
    });

    it('fills fully for time logged on an unplanned task, without a check', () => {
        renderPill({ worked: 15, goal: 0, done: false, label: '15m logged' });
        expect(getComputedStyle(screen.getByTestId('daily-time-pill-fill')).width).toBe('100%');
        expect(screen.queryByTestId('CheckIcon')).toBeNull();
    });

    it('fills fully with a check once done', () => {
        renderPill({ worked: 0, goal: 0, done: true, label: 'Done' });
        expect(getComputedStyle(screen.getByTestId('daily-time-pill-fill')).width).toBe('100%');
        expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
    });

    it('has no fill before any time is logged', () => {
        renderPill({ worked: 0, goal: 30, done: false });
        expect(screen.queryByTestId('daily-time-pill-fill')).toBeNull();
    });
});
