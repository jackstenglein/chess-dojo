import { User } from '@/database/user';
import { cleanup, fireEvent, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeatmapSettingsButton, useHeatmapOptions } from './HeatmapOptions';
import { makeUser, renderHeatmap } from './heatmapTestUtils';

const auth = vi.hoisted(() => ({
    user: undefined as User | undefined,
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: auth.user }),
}));

describe('useHeatmapOptions', () => {
    beforeEach(() => {
        localStorage.clear();
        auth.user = makeUser();
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    it('defaults to hours worked, a one hour scale, and the user week', () => {
        auth.user = makeUser({ weekStart: 1 });

        const { result } = renderHook(() => useHeatmapOptions());

        expect(result.current).toMatchObject({
            field: 'minutesSpent',
            maxPoints: 1,
            maxMinutes: 60,
            colorMode: 'standard',
            weekStartOn: 1,
            weekEndOn: 0,
        });
    });

    it('uses the saved calendar week when the user has not chosen one', () => {
        auth.user = undefined;
        localStorage.setItem('calendarFilters.weekStartOn', JSON.stringify(3));

        const { result } = renderHook(() => useHeatmapOptions());

        expect(result.current.weekStartOn).toBe(3);
        expect(result.current.weekEndOn).toBe(2);
    });

    it('prefers the user week over the saved calendar week', () => {
        auth.user = makeUser({ weekStart: 1 });
        localStorage.setItem('calendarFilters.weekStartOn', JSON.stringify(3));

        const { result } = renderHook(() => useHeatmapOptions());

        expect(result.current.weekStartOn).toBe(1);
        expect(result.current.weekEndOn).toBe(0);
    });
});

describe('HeatmapSettingsButton', () => {
    beforeEach(() => {
        localStorage.clear();
        auth.user = makeUser();
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    function openSettings() {
        renderHeatmap(<HeatmapSettingsButton />);
        fireEvent.click(screen.getByRole('button', { name: 'Heatmap settings' }));
        return screen.getByTestId('heatmap-settings');
    }

    it('changes the measure and the goal that sets the color scale', () => {
        openSettings();

        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Hours Worked');
        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Goal' }));
        let listbox = screen.getByRole('listbox');
        expect(within(listbox).getByRole('option', { name: '1 hour' })).toBeInTheDocument();
        expect(within(listbox).getByRole('option', { name: '4 hours' })).toBeInTheDocument();
        fireEvent.click(within(listbox).getByRole('option', { name: '2 hours' }));

        expect(localStorage.getItem('activityHeatmap.maxMinutes')).toBe('120');
        expect(screen.getByRole('combobox', { name: 'Goal' })).toHaveTextContent('2 hours');

        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Type' }));
        fireEvent.click(screen.getByRole('option', { name: 'Dojo Points' }));
        expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Dojo Points');
        expect(localStorage.getItem('activityHeatmap.field')).toBe(JSON.stringify('dojoPoints'));

        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Goal' }));
        listbox = screen.getByRole('listbox');
        expect(within(listbox).getByRole('option', { name: '1 point' })).toBeInTheDocument();
        fireEvent.click(within(listbox).getByRole('option', { name: '3 points' }));

        expect(screen.getByRole('combobox', { name: 'Goal' })).toHaveTextContent('3 points');
        expect(localStorage.getItem('activityHeatmap.maxPoints')).toBe('3');
    });

    it('remembers single color mode', () => {
        openSettings();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Single Color Mode' }));

        expect(screen.getByRole('checkbox', { name: 'Single Color Mode' })).toBeChecked();
        expect(localStorage.getItem('activityHeatmap.colorMode')).toBe(
            JSON.stringify('monochrome'),
        );

        cleanup();
        renderHeatmap(<HeatmapSettingsButton />);
        fireEvent.click(screen.getByRole('button', { name: 'Heatmap settings' }));

        expect(screen.getByRole('checkbox', { name: 'Single Color Mode' })).toBeChecked();
    });
});
