import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { currentStreak, RushResults, SessionStreak } from './RushResults';

afterEach(cleanup);

describe('RushResults', () => {
    it('marks each puzzle solved or missed, with its rating', () => {
        render(
            <RushResults
                results={[
                    { id: '001', rating: 1100, ok: true },
                    { id: '002', rating: 1250, ok: false },
                    { id: '003', rating: 1300, ok: true },
                ]}
            />,
        );
        expect(screen.getByLabelText('Solved 1100')).toBeTruthy();
        expect(screen.getByLabelText('Missed 1250')).toBeTruthy();
        expect(screen.getAllByLabelText(/^Solved/)).toHaveLength(2);
        expect(screen.getByText('1300')).toBeTruthy();
    });

    it('shows nothing before any puzzle is finished', () => {
        render(<RushResults results={[]} />);
        expect(screen.queryByLabelText('Puzzles this session')).toBeNull();
    });

    it('copes with a puzzle that has no rating', () => {
        render(<RushResults results={[{ id: '001', ok: true }]} />);
        expect(screen.getByLabelText('Solved')).toBeTruthy();
    });
});

describe('the streak', () => {
    const ok = (id: string) => ({ id, rating: 1000, ok: true });
    const miss = (id: string) => ({ id, rating: 1000, ok: false });

    it('is the clean solves at the end', () => {
        expect(currentStreak([])).toBe(0);
        expect(currentStreak([ok('1'), ok('2')])).toBe(2);
        expect(currentStreak([ok('1'), miss('2'), ok('3'), ok('4'), ok('5')])).toBe(3);
        expect(currentStreak([ok('1'), miss('2')])).toBe(0);
    });

    it('is set apart as a band from two in a row', () => {
        render(<RushResults results={[miss('1'), ok('2'), ok('3'), ok('4')]} />);
        expect(screen.getByLabelText('3 in a row')).toBeTruthy();
    });

    it('is not set apart when it is just one solve', () => {
        render(<RushResults results={[miss('1'), ok('2')]} />);
        expect(screen.queryByLabelText(/in a row/)).toBeNull();
    });
});

describe('SessionStreak', () => {
    const ok = (id: string) => ({ id, rating: 1000, ok: true });

    it('shows how many are correct, and the streak from two in a row', () => {
        render(<SessionStreak results={[ok('1'), ok('2'), ok('3')]} streak={3} />);
        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.getByText('correct')).toBeTruthy();
        expect(screen.getByText('3 in a row!')).toBeTruthy();
    });

    it('has no flame for a single solve', () => {
        render(<SessionStreak results={[ok('1')]} streak={1} />);
        expect(screen.queryByText(/in a row!/)).toBeNull();
    });
});

describe('SessionStreak without the count', () => {
    const ok = (id: string) => ({ id, rating: 1000, ok: true });

    it('leaves out how many are correct but keeps the streak and the marks', () => {
        render(<SessionStreak results={[ok('1'), ok('2')]} streak={2} showCount={false} />);
        expect(screen.queryByText('correct')).toBeNull();
        expect(screen.getByText('2 in a row!')).toBeTruthy();
        expect(screen.getByLabelText('Puzzles this session')).toBeTruthy();
    });
});
