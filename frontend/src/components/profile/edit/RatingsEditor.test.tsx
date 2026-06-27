import { RatingSystem } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { createTranslator } from 'use-intl/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '~/messages/en.json';
import type { RatingEditor } from './RatingsEditor';
import {
    RatingsEditor,
    getInitialVisibleRatingSystems,
    getRatingSystemLabel,
    hasEnteredRatingSystemData,
} from './RatingsEditor';

afterEach(cleanup);

const t = createTranslator({ locale: 'en', messages, namespace: 'enums.ratingSystem' });

function editor(overrides: Partial<RatingEditor> = {}): RatingEditor {
    return {
        username: '',
        hideUsername: false,
        startRating: '0',
        currentRating: '0',
        name: '',
        ...overrides,
    };
}

function editors(
    overrides: Partial<Record<RatingSystem, Partial<RatingEditor>>> = {},
): Record<RatingSystem, RatingEditor> {
    return Object.values(RatingSystem).reduce<Record<string, RatingEditor>>((result, system) => {
        result[system] = editor(overrides[system]);
        return result;
    }, {});
}

describe('RatingsEditor visibility helpers', () => {
    it('treats standard systems with usernames as configured', () => {
        expect(
            hasEnteredRatingSystemData(RatingSystem.Chesscom, editor({ username: 'kaya' })),
        ).toBe(true);
        expect(hasEnteredRatingSystemData(RatingSystem.Lichess, editor())).toBe(false);
    });

    it('treats custom systems with names or ratings as configured', () => {
        expect(hasEnteredRatingSystemData(RatingSystem.Custom, editor({ name: 'OTB' }))).toBe(true);
        expect(
            hasEnteredRatingSystemData(RatingSystem.Custom2, editor({ currentRating: '1400' })),
        ).toBe(true);
        expect(hasEnteredRatingSystemData(RatingSystem.Custom3, editor())).toBe(false);
    });

    it('always includes the preferred system first', () => {
        const result = getInitialVisibleRatingSystems(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
                [RatingSystem.Uscf]: { username: '12345678' },
            }),
            RatingSystem.Uscf,
        );

        expect(result).toEqual([RatingSystem.Uscf, RatingSystem.Chesscom]);
    });

    it('disambiguates repeated custom rating labels', () => {
        expect(
            getRatingSystemLabel(
                RatingSystem.Custom,
                t as ReturnType<typeof useTranslations<'enums.ratingSystem'>>,
            ),
        ).toBe('Custom');
        expect(
            getRatingSystemLabel(
                RatingSystem.Custom2,
                t as ReturnType<typeof useTranslations<'enums.ratingSystem'>>,
            ),
        ).toBe('Custom (2)');
        expect(
            getRatingSystemLabel(
                RatingSystem.Custom3,
                t as ReturnType<typeof useTranslations<'enums.ratingSystem'>>,
            ),
        ).toBe('Custom (3)');
    });
});

function renderRatingsEditor(
    ratingEditors: Record<RatingSystem, RatingEditor>,
    ratingSystem = RatingSystem.Chesscom,
) {
    renderWithIntl(
        <RatingsEditor
            dojoCohort='1600-1700'
            setDojoCohort={vi.fn()}
            ratingSystem={ratingSystem}
            setRatingSystem={vi.fn()}
            ratingEditors={ratingEditors}
            setRatingEditors={vi.fn()}
            enableZenMode={false}
            setEnableZenMode={vi.fn()}
            errors={{}}
        />,
    );
}

describe('RatingsEditor initial rendering', () => {
    it('renders configured systems and hides blank systems', () => {
        renderRatingsEditor(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
                [RatingSystem.Uscf]: { username: '12345678', startRating: '1550' },
            }),
        );

        expect(screen.getByLabelText(/Chess\.com Username/)).toBeInTheDocument();
        expect(screen.getByLabelText(/USCF ID/)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Lichess Username/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/FIDE ID/)).not.toBeInTheDocument();
    });

    it('limits preferred dropdown options to visible systems', () => {
        renderRatingsEditor(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
                [RatingSystem.Uscf]: { username: '12345678' },
            }),
            RatingSystem.Chesscom,
        );

        fireEvent.mouseDown(screen.getByRole('combobox', { name: /Preferred Rating System/ }));
        const listbox = screen.getByRole('listbox');

        expect(
            within(listbox).getByRole('option', { name: 'Chess.com Rapid' }),
        ).toBeInTheDocument();
        expect(within(listbox).getByRole('option', { name: 'USCF' })).toBeInTheDocument();
        expect(within(listbox).queryByRole('option', { name: 'Lichess Classical' })).toBeNull();
    });

    it('renders the preferred system first in the editor rows', () => {
        renderRatingsEditor(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
                [RatingSystem.Custom]: { name: 'OTB' },
            }),
            RatingSystem.Custom,
        );

        expect(screen.getAllByRole('textbox')[0]).toBe(
            screen.getByLabelText(/Custom 1 Rating Name/),
        );
    });
});

describe('RatingsEditor add menu', () => {
    it('adds a hidden standard rating system to the editor', () => {
        renderRatingsEditor(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add Rating System' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /Lichess Classical/ }));

        expect(screen.getByLabelText(/Lichess Username/)).toBeInTheDocument();
    });

    it('makes an added rating system available in the preferred dropdown', () => {
        renderRatingsEditor(
            editors({
                [RatingSystem.Chesscom]: { username: 'kaya' },
            }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add Rating System' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /Lichess Classical/ }));
        fireEvent.mouseDown(screen.getByRole('combobox', { name: /Preferred Rating System/ }));

        expect(
            within(screen.getByRole('listbox')).getByRole('option', {
                name: 'Lichess Classical',
            }),
        ).toBeInTheDocument();
    });
});
