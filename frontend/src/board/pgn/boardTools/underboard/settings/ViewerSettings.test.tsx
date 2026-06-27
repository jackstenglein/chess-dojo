import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewerSettings, {
    CoordinateSize,
    CoordinateSizeKey,
    ShowInlineCommentsInPgn,
    ViewerSetting,
} from './ViewerSettings';

vi.mock('./KeyboardShortcuts', () => ({
    default: () => null,
}));

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe('ViewerSettings coordinate size', () => {
    it('shows the coordinate size setting with the standard default', () => {
        renderWithIntl(<ViewerSettings />);

        expect(screen.getByRole('combobox', { name: 'Coordinate Size' })).toHaveTextContent(
            'Standard',
        );
    });

    it('persists the large coordinate size selection', async () => {
        renderWithIntl(<ViewerSettings />);

        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Coordinate Size' }));
        const listbox = await screen.findByRole('listbox');
        fireEvent.click(within(listbox).getByRole('option', { name: 'Large' }));

        expect(localStorage.getItem(CoordinateSizeKey)).toBe(JSON.stringify(CoordinateSize.Large));
    });

    it('can be hidden by enabledSettings', () => {
        renderWithIntl(
            <ViewerSettings enabledSettings={{ [ViewerSetting.CoordinateStyle]: true }} />,
        );

        expect(screen.queryByRole('combobox', { name: 'Coordinate Size' })).not.toBeInTheDocument();
    });

    it('can be shown by enabledSettings', () => {
        renderWithIntl(
            <ViewerSettings enabledSettings={{ [ViewerSetting.CoordinateSize]: true }} />,
        );

        expect(screen.getByRole('combobox', { name: 'Coordinate Size' })).toBeInTheDocument();
    });
});

describe('ViewerSettings inline comments in PGN', () => {
    it('shows inline comments in PGN by default', () => {
        renderWithIntl(<ViewerSettings />);

        expect(
            screen.getByRole('checkbox', { name: 'Display comments in PGN text' }),
        ).toBeChecked();
    });

    it('persists the inline comments in PGN selection', () => {
        renderWithIntl(<ViewerSettings />);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Display comments in PGN text' }));

        expect(localStorage.getItem(ShowInlineCommentsInPgn.key)).toBe(JSON.stringify(false));
    });

    it('can hide the inline comments in PGN setting with enabledSettings', () => {
        renderWithIntl(
            <ViewerSettings enabledSettings={{ [ViewerSetting.CoordinateStyle]: true }} />,
        );

        expect(
            screen.queryByRole('checkbox', { name: 'Display comments in PGN text' }),
        ).not.toBeInTheDocument();
    });

    it('can show the inline comments in PGN setting with enabledSettings', () => {
        renderWithIntl(
            <ViewerSettings enabledSettings={{ [ViewerSetting.DisplayInlineComments]: true }} />,
        );

        expect(
            screen.getByRole('checkbox', { name: 'Display comments in PGN text' }),
        ).toBeInTheDocument();
    });
});
