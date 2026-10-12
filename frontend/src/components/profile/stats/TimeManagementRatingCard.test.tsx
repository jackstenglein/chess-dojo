import { User } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeUser } from '../info/heatmapTestUtils';
import StatsTab from './StatsTab';
import { getTimeManagementChartData, TimeManagementRatingCard } from './TimeManagementRatingCard';

const mocks = vi.hoisted(() => ({ user: undefined as User | undefined, chart: vi.fn() }));
vi.mock('@/auth/Auth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/api/Api', () => ({ useApi: () => ({}) }));
vi.mock('./TacticsScoreCard', () => ({ default: () => null }));
vi.mock('@mui/x-charts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@mui/x-charts')>()),
    LineChart: ({
        xAxis,
        series,
    }: {
        xAxis: { data: Date[] }[];
        series: { label: string; data: number[]; showMark: boolean }[];
    }) => {
        mocks.chart(
            series.map(({ label, data, showMark }) => ({
                label,
                showMark,
                data: xAxis[0].data.map((date, i) => ({ date, rating: data[i] })),
            })),
        );
        return <div data-testid='time-management-chart' />;
    },
}));

const history = [
    { date: '2026-10-01', rating: 1800 },
    { date: '2026-11-20', rating: 1900 },
];
function profile(overrides: Partial<User> = {}) {
    return makeUser({
        timeManagementRating: { currentRating: 1900, numGames: 12 },
        timeManagementRatingHistory: history,
        ...overrides,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
    mocks.user = makeUser();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('getTimeManagementChartData', () => {
    it('sorts real observations and excludes invalid, future, and older points', () => {
        const points = getTimeManagementChartData([
            { date: '2026-11-20', rating: 1900 },
            { date: '2025-11-19', rating: 1500 },
            { date: '2026-11-21', rating: 2000 },
            { date: 'not-a-date', rating: 1800 },
            { date: '2026-10-01', rating: -1 },
            { date: '2026-10-02', rating: NaN },
            { date: '2025-11-20', rating: 0 },
        ]);
        expect(points).toEqual([
            { date: new Date('2025-11-20'), rating: 0 },
            { date: new Date('2026-11-20'), rating: 1900 },
        ]);
    });

    it('does not fabricate history when none has been recorded', () => {
        expect(getTimeManagementChartData()).toEqual([]);
        expect(getTimeManagementChartData([{ date: '2025-01-01', rating: 1800 }])).toEqual([]);
    });
});

describe('TimeManagementRatingCard', () => {
    it('shows the current aggregate and passes the last year of history to the existing chart', () => {
        renderWithIntl(<TimeManagementRatingCard user={profile()} />);
        expect(screen.getByText('Time Management')).toBeInTheDocument();
        expect(screen.getByText('1900')).toBeInTheDocument();
        expect(screen.getByText('12 games')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Time Management' })).toBeInTheDocument();
        expect(mocks.chart).toHaveBeenCalledWith([
            {
                label: 'Rating',
                showMark: false,
                data: history.map((point) => ({ ...point, date: new Date(point.date) })),
            },
        ]);
    });

    it('marks provisional ratings and displays a single recorded point', () => {
        renderWithIntl(
            <TimeManagementRatingCard
                user={profile({
                    timeManagementRating: { currentRating: 1800, numGames: 1 },
                    timeManagementRatingHistory: [history[0]],
                })}
            />,
        );
        expect(screen.getByText('1800?')).toBeInTheDocument();
        expect(screen.getByText('1 game')).toBeInTheDocument();
        expect(screen.getByTestId('time-management-chart')).toBeInTheDocument();
        expect(mocks.chart).toHaveBeenCalledWith([expect.objectContaining({ showMark: true })]);
    });

    it('shows the existing rating without a fake graph for profiles awaiting history backfill', () => {
        renderWithIntl(
            <TimeManagementRatingCard user={profile({ timeManagementRatingHistory: undefined })} />,
        );
        expect(screen.getByText('1900')).toBeInTheDocument();
        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(mocks.chart).not.toHaveBeenCalled();
    });

    it('does not render when no games have a time management rating', () => {
        const { rerender } = renderWithIntl(
            <TimeManagementRatingCard user={profile({ timeManagementRating: undefined })} />,
        );
        expect(screen.queryByText('Time Management')).not.toBeInTheDocument();
        rerender(
            <TimeManagementRatingCard
                user={profile({ timeManagementRating: { currentRating: 0, numGames: 0 } })}
            />,
        );
        expect(screen.queryByText('Time Management')).not.toBeInTheDocument();
    });

    it('stays behind the Ratings tab Zen Mode gate', () => {
        mocks.user = profile({ enableZenMode: true });
        renderWithIntl(<StatsTab user={profile()} />);
        expect(screen.getByText('Ratings are hidden in Zen Mode.')).toBeInTheDocument();
        expect(screen.queryByText('Time Management')).not.toBeInTheDocument();
        expect(mocks.chart).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'View Anyway' }));
        expect(screen.getByText('Time Management')).toBeInTheDocument();
    });
});
