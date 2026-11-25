import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ViewerSettings, {
    CoordinateSize,
    CoordinateSizeKey,
    PgnTextFontSize,
    PgnTextFontSizeKey,
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

describe.each([
    {
        label: 'Coordinate Size',
        option: 'Large',
        storageKey: CoordinateSizeKey,
        storedValue: CoordinateSize.Large,
        setting: ViewerSetting.CoordinateSize,
    },
    {
        label: 'PGN Text Font Size',
        option: 'Extra Large',
        storageKey: PgnTextFontSizeKey,
        storedValue: PgnTextFontSize.ExtraLarge,
        setting: ViewerSetting.PgnTextFontSize,
    },
])('ViewerSettings $label', ({ label, option, storageKey, storedValue, setting }) => {
    it('shows the setting with the standard default', () => {
        renderWithIntl(<ViewerSettings />);

        expect(screen.getByRole('combobox', { name: label })).toHaveTextContent('Standard');
    });

    it(`persists the ${option} selection`, async () => {
        renderWithIntl(<ViewerSettings />);

        fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
        const listbox = await screen.findByRole('listbox');
        fireEvent.click(within(listbox).getByRole('option', { name: option }));

        expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(storedValue));
    });

    it('can be hidden by enabledSettings', () => {
        renderWithIntl(
            <ViewerSettings enabledSettings={{ [ViewerSetting.CoordinateStyle]: true }} />,
        );

        expect(screen.queryByRole('combobox', { name: label })).not.toBeInTheDocument();
    });

    it('can be shown by enabledSettings', () => {
        renderWithIntl(<ViewerSettings enabledSettings={{ [setting]: true }} />);

        expect(screen.getByRole('combobox', { name: label })).toBeInTheDocument();
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
