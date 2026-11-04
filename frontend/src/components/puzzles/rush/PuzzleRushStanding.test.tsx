import { PuzzleRushStanding } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PuzzleRushBests, PuzzleRushIndexes } from './PuzzleRushStanding';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) =>
        values ? `${key} ${JSON.stringify(values)}` : key,
}));

const standing: PuzzleRushStanding = {
    score: 8,
    index: { allTime: 56, week: 30, day: 4 },
    bests: {
        allTime: { score: 40, sessionCreatedAt: '2026-10-01T00:00:00.000Z' },
        week: { score: 22, sessionCreatedAt: '2026-10-26T00:00:00.000Z' },
        day: { score: 12, sessionCreatedAt: '2026-10-26T12:00:00.000Z' },
    },
    newBest: { allTime: false, week: false, day: true },
};

describe('PuzzleRushIndexes', () => {
    it('shows where this score sits among the player’s own runs', () => {
        render(<PuzzleRushIndexes standing={standing} />);

        expect(screen.getByText('indexAllTime')).toBeTruthy();
        expect(screen.getByText('indexThisWeek')).toBeTruthy();
        expect(screen.getByText('newBestToday')).toBeTruthy();
        expect(screen.getByText('scoreIndex {"index":56}')).toBeTruthy();
        expect(screen.getByText('scoreIndex {"index":30}')).toBeTruthy();
        expect(screen.getByText('scoreIndex {"index":4}')).toBeTruthy();
    });
});

describe('PuzzleRushBests', () => {
    it('shows the solved-puzzle best for each current window', () => {
        render(
            <PuzzleRushBests
                bests={{
                    allTime: standing.bests.allTime,
                    day: standing.bests.day,
                }}
            />,
        );

        expect(screen.getByText('bestAllTime')).toBeTruthy();
        expect(screen.getByText('40')).toBeTruthy();
        expect(screen.getByText('bestThisWeek')).toBeTruthy();
        expect(screen.getByText('bestToday')).toBeTruthy();
        expect(screen.getByText('12')).toBeTruthy();
        expect(screen.getAllByText('—')).toHaveLength(1);
    });
});
