import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DirectoryTimeManagement } from './StatsButton';

afterEach(() => {
    cleanup();
});

describe('DirectoryTimeManagement', () => {
    it('shows the rating, game count, and fast icon', () => {
        renderWithIntl(
            <DirectoryTimeManagement rating={{ currentRating: 1900, numGames: 12, area: 25 }} />,
        );

        expect(screen.getByText('Time Management')).toBeInTheDocument();
        expect(screen.getByTestId('directory-time-management-rating')).toHaveTextContent('1900');
        expect(screen.getByText('12 games')).toBeInTheDocument();
        expect(screen.getByTestId('time-management-fast-icon')).toBeInTheDocument();
        expect(
            screen.getByLabelText('You tend to play faster than the ideal clock curve on average.'),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText('Calculated from games in this folder that include clock times.'),
        ).toBeInTheDocument();
    });

    it('marks a rating from fewer than 10 games as provisional', () => {
        renderWithIntl(
            <DirectoryTimeManagement rating={{ currentRating: 1800, numGames: 4, area: -10 }} />,
        );

        expect(screen.getByTestId('directory-time-management-rating')).toHaveTextContent('1800?');
        expect(screen.getByText('4 games')).toBeInTheDocument();
        expect(screen.getByTestId('time-management-slow-icon')).toBeInTheDocument();
    });

    it('shows N/A when the folder has no clock games', () => {
        renderWithIntl(<DirectoryTimeManagement rating={{ currentRating: 0, numGames: 0 }} />);

        expect(screen.getByTestId('directory-time-management-rating')).toHaveTextContent('N/A');
        expect(screen.queryByText(/\d+ games?/)).not.toBeInTheDocument();
        expect(screen.queryByTestId('time-management-fast-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('time-management-slow-icon')).not.toBeInTheDocument();
    });

    it('renders nothing when the stats response has no time management rating', () => {
        renderWithIntl(<DirectoryTimeManagement />);

        expect(screen.queryByText('Time Management')).not.toBeInTheDocument();
    });
});
