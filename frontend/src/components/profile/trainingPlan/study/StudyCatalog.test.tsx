import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudyBook, StudyItem } from './book';
import { StudyCatalog } from './StudyCatalog';

const item = (key: string, name: string): StudyItem => ({
    kind: 'canonical',
    key,
    name,
    pgn: '',
    orientation: 'white',
    allowExport: false,
});
const a1 = item('a1', 'Problem 1');
const a2 = item('a2', 'Problem 2');
const b1 = item('b1', 'Problem 51');
const b2 = item('b2', 'Problem 52');
const book: StudyBook = {
    title: 'Polgar',
    chapters: [
        { name: 'Problems 1-50', items: [a1, a2] },
        { name: 'Problems 51-100', items: [b1, b2] },
    ],
    skipped: 0,
};

function renderCatalog(current: StudyItem, bookValue = book) {
    const props = {
        book: bookValue,
        current,
        done: new Set<string>(),
        workedOn: new Set<string>(),
        historyComplete: true,
        onSelect: vi.fn(),
    };
    const view = renderWithIntl(<StudyCatalog {...props} />);
    return {
        rerender: (next: StudyItem) => view.rerender(<StudyCatalog {...props} current={next} />),
    };
}

const chapter = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('StudyCatalog chapters', () => {
    afterEach(cleanup);

    it('opens only the current chapter', () => {
        renderCatalog(a1);
        expect(chapter('Problems 1-50')).toHaveAttribute('aria-expanded', 'true');
        expect(chapter('Problems 51-100')).toHaveAttribute('aria-expanded', 'false');
    });

    it('lets the member open another chapter and close the current one', () => {
        renderCatalog(a1);
        fireEvent.click(chapter('Problems 51-100'));
        expect(chapter('Problems 51-100')).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(chapter('Problems 1-50'));
        expect(chapter('Problems 1-50')).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens the chapter the member moves into and closes the one they left', () => {
        const { rerender } = renderCatalog(a1);
        rerender(b1);
        expect(chapter('Problems 51-100')).toHaveAttribute('aria-expanded', 'true');
        expect(chapter('Problems 1-50')).toHaveAttribute('aria-expanded', 'false');
        rerender(b2);
        expect(chapter('Problems 51-100')).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens a chapter the member closed again once they come back to it', () => {
        const { rerender } = renderCatalog(a1);
        fireEvent.click(chapter('Problems 1-50'));
        expect(chapter('Problems 1-50')).toHaveAttribute('aria-expanded', 'false');
        rerender(b1);
        rerender(a2);
        expect(chapter('Problems 1-50')).toHaveAttribute('aria-expanded', 'true');
    });

    it('tells apart two chapters with the same name', () => {
        const c1 = item('c1', 'Problem 101');
        const c2 = item('c2', 'Problem 102');
        const repeated: StudyBook = {
            title: 'Silman',
            chapters: [
                { name: 'Section 20', items: [a1, a2] },
                { name: 'Section 13', items: [b1, b2] },
                { name: 'Section 20', items: [c1, c2] },
            ],
            skipped: 0,
        };
        renderCatalog(c1, repeated);
        const [first, last] = screen.getAllByRole('button', { name: /Section 20/ });
        expect(first).toHaveAttribute('aria-expanded', 'false');
        expect(last).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(last);
        expect(first).toHaveAttribute('aria-expanded', 'false');
        expect(last).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('StudyCatalog one-item chapters', () => {
    afterEach(cleanup);

    const c1 = item('c1', 'Dummy 017');
    const mixed: StudyBook = {
        title: 'Logical Chess',
        chapters: [
            { name: 'Section 4', items: [a1, a2] },
            { name: 'Section 5', items: [c1] },
            { name: 'Section 6', items: [b1, b2] },
        ],
        skipped: 0,
    };

    it('closes a one-item chapter like the others in a book with longer chapters', () => {
        const { rerender } = renderCatalog(a1, mixed);
        expect(chapter('Section 4')).toHaveAttribute('aria-expanded', 'true');
        expect(chapter('Section 5')).toHaveAttribute('aria-expanded', 'false');
        expect(chapter('Section 6')).toHaveAttribute('aria-expanded', 'false');
        rerender(c1);
        expect(chapter('Section 5')).toHaveAttribute('aria-expanded', 'true');
        expect(chapter('Section 4')).toHaveAttribute('aria-expanded', 'false');
    });

    it('lists a book of single games without chapter headers', () => {
        const games: StudyBook = {
            title: 'Master Games',
            chapters: [
                { name: 'Spassky-Tal 1956', items: [item('g1', 'Spassky-Tal 1956')] },
                { name: 'Geller-Spassky 1955', items: [item('g2', 'Geller-Spassky 1955')] },
            ],
            skipped: 0,
        };
        renderCatalog(games.chapters[0].items[0], games);
        expect(screen.getAllByTestId('study-item').map((row) => row.textContent)).toEqual([
            '1Spassky-Tal 1956',
            '2Geller-Spassky 1955',
        ]);
        expect(document.querySelectorAll('[aria-expanded]')).toHaveLength(0);
    });
});
