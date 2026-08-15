import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimeManagementRatingRow } from './TimeManagementRatingRow';

afterEach(() => {
    cleanup();
});

describe('TimeManagementRatingRow', () => {
    it('shows a bunny for positive average area', () => {
        render(
            <TimeManagementRatingRow
                timeManagementRating={{ currentRating: 2100, numGames: 12, area: 25 }}
            />,
        );

        expect(screen.getByText('2100')).toBeInTheDocument();
        expect(screen.getByText('(12 games)')).toBeInTheDocument();
        expect(screen.getByTestId('time-management-fast-icon')).toBeInTheDocument();
        expect(
            screen.getByLabelText('You tend to play faster than the ideal clock curve on average.'),
        ).toBeInTheDocument();
    });

    it('shows a sloth for negative average area', () => {
        render(
            <TimeManagementRatingRow
                timeManagementRating={{ currentRating: 1800, numGames: 11, area: -40 }}
            />,
        );

        expect(screen.getByTestId('time-management-slow-icon')).toBeInTheDocument();
        expect(
            screen.getByLabelText('You tend to play slower than the ideal clock curve on average.'),
        ).toBeInTheDocument();
    });

    it('shows no direction icon for neutral or missing area', () => {
        render(
            <TimeManagementRatingRow
                timeManagementRating={{ currentRating: 2000, numGames: 10 }}
            />,
        );

        expect(screen.queryByTestId('time-management-fast-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('time-management-slow-icon')).not.toBeInTheDocument();
    });

    it('marks ratings with fewer than 10 games as provisional', () => {
        render(
            <TimeManagementRatingRow
                timeManagementRating={{ currentRating: 1900, numGames: 4, area: 10 }}
            />,
        );

        expect(screen.getByText('1900?')).toBeInTheDocument();
        expect(screen.getByText('(4 games)')).toBeInTheDocument();
    });
});
