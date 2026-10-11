import { AttemptScoring } from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { averageTooltip, formatDelta, formatSpeed, ScoreSummary } from './ScoreSummary';

afterEach(cleanup);

const scoring = (over: Partial<AttemptScoring> = {}): AttemptScoring => ({
    accuracy: 1,
    speed: 0.92,
    score: 0.92,
    thinkingMs: 41_000,
    referenceMs: 30_000,
    counted: true,
    puzzleRating: 1600,
    expected: 0.4,
    ratingBefore: 2335,
    ratingAfter: 2341.4,
    delta: 6.4,
    ...over,
});

describe('ScoreSummary averages', () => {
    const average = { attempts: 12, accuracy: 0.78, speed: 0.86, score: 0.67, thinkingMs: 20_000 };

    it('shows the cohort average small and clearly labelled, apart from the member’s own', () => {
        render(<ScoreSummary scoring={scoring({ average })} />);
        const cohort = within(screen.getByLabelText('Average of players near your rating'));
        expect(cohort.getByText('Avg')).toBeTruthy();
        expect(screen.queryByText('Cohort average')).toBeNull();
        expect(cohort.getByText('78%')).toBeTruthy();
        expect(cohort.getByText('0.86')).toBeTruthy();
        expect(cohort.getByText('67')).toBeTruthy();
        // The member's own numbers are still there, apart from the averages.
        expect(screen.getByText('0.92')).toBeTruthy();
        expect(screen.queryByText(/Took/)).toBeNull();
    });

    it('shows no averages until there are some', () => {
        render(<ScoreSummary scoring={scoring()} />);
        expect(screen.queryByLabelText('Average of players near your rating')).toBeNull();
    });
});

describe('averageTooltip', () => {
    it('gives the range of ratings the average is of: the member’s rating, plus and minus 200', () => {
        expect(averageTooltip(1613)).toBe('Average scores for players rated 1413 to 1813');
        expect(averageTooltip(1000.4)).toBe('Average scores for players rated 800 to 1200');
    });

    it('still says what it is of when the rating is not known', () => {
        expect(averageTooltip()).toBe('Average scores for players rated within 200 points of you');
    });
});

describe('formatSpeed', () => {
    it('is a plain number without trailing zeros', () => {
        expect(formatSpeed(0.7)).toBe('0.7');
        expect(formatSpeed(0.9234)).toBe('0.92');
        expect(formatSpeed(1)).toBe('1');
    });
});

describe('formatDelta', () => {
    it('shows the sign and one decimal', () => {
        expect(formatDelta(6.42)).toBe('+6.4');
        expect(formatDelta(-3.06)).toBe('−3.1');
        expect(formatDelta(0)).toBe('±0');
        expect(formatDelta(0.04)).toBe('±0');
    });
});

describe('ScoreSummary', () => {
    it('shows the new rating, the change, and how the score was made up', () => {
        render(<ScoreSummary scoring={scoring()} />);
        expect(screen.getByText('2341')).toBeTruthy();
        expect(screen.getByText('+6.4')).toBeTruthy();
        expect(screen.getByText('100%')).toBeTruthy();
        expect(screen.getByText('0.92')).toBeTruthy();
        expect(screen.getByText('92')).toBeTruthy();
        expect(screen.queryByText(/vs puzzle/)).toBeNull();
    });

    it('shows a fall in rating', () => {
        render(<ScoreSummary scoring={scoring({ delta: -4.2, ratingAfter: 2330.8, score: 0 })} />);
        expect(screen.getByText('−4.2')).toBeTruthy();
        expect(screen.getByText('2331')).toBeTruthy();
    });

    it('says a repeat does not affect the rating, and still shows the rating', () => {
        render(
            <ScoreSummary
                scoring={scoring({
                    counted: false,
                    delta: undefined,
                    ratingBefore: 2335,
                    ratingAfter: 2335,
                })}
            />,
        );
        expect(screen.getByText(/does not affect your rating/)).toBeTruthy();
        expect(screen.getByText('Tactics rating')).toBeTruthy();
        expect(screen.getByText('2335')).toBeTruthy();
        // Nothing moved, so there is no change to show.
        expect(screen.queryByText(/^[+−±]/)).toBeNull();
    });

    it('shows a dash for speed when time is not counted yet', () => {
        render(<ScoreSummary scoring={scoring({ referenceMs: undefined, speed: 1 })} />);
        expect(screen.getByText('—')).toBeTruthy();
    });

    it('shows a placeholder while the server is scoring', () => {
        render(<ScoreSummary />);
        expect(screen.getByLabelText('Scoring')).toBeTruthy();
    });

    it('says so if the puzzle could not be scored', () => {
        render(<ScoreSummary failed />);
        expect(screen.getByText('This puzzle could not be scored.')).toBeTruthy();
    });
});
