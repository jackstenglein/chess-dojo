import { renderWithIntl } from '@/i18n/intl.test';
import { LocalizationProvider } from '@mui/x-date-pickers-pro';
import { AdapterLuxon } from '@mui/x-date-pickers-pro/AdapterLuxon';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchFilters from './SearchFilters';

const { api, authState, searchGames, searchParamsState, setSearchParams, trackEvent } = vi.hoisted(
    () => ({
        api: { listGamesByPosition: vi.fn() },
        authState: { user: { dojoCohort: '1500-1600' }, isFreeTier: false },
        searchGames: vi.fn(),
        searchParamsState: { value: '' },
        setSearchParams: vi.fn(),
        trackEvent: vi.fn(),
    }),
);

vi.mock('@/analytics/events', () => ({
    EventType: { SearchGames: 'search_games' },
    trackEvent,
}));

vi.mock('@/api/Api', () => ({
    useApi: () => api,
}));

vi.mock('@/api/gameApi', () => ({
    searchGames,
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: authState.user }),
    useFreeTier: () => authState.isFreeTier,
}));

vi.mock('@/components/navigation/Link', async () => {
    const { forwardRef } = await import('react');
    return {
        Link: forwardRef<HTMLAnchorElement, { children?: React.ReactNode }>((props, ref) => (
            <a ref={ref} {...props} />
        )),
    };
});

vi.mock('@/scoreboard/CohortIcon', () => ({
    default: () => <span data-testid='cohort-icon' />,
}));

vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: (defaultInit?: Record<string, string>) => {
        const searchParams = new URLSearchParams(searchParamsState.value);
        for (const [key, value] of Object.entries(defaultInit ?? {})) {
            if (!searchParams.has(key)) {
                searchParams.set(key, value);
            }
        }
        return { searchParams, setSearchParams, updateSearchParams: vi.fn() };
    },
}));

/** The MUI select trigger inside the field with the given test id. */
function combobox(testId: string) {
    return within(screen.getByTestId(testId)).getByRole('combobox');
}

/** The value held by the MUI select with the given test id. */
function selectValue(testId: string) {
    return screen.getByTestId(testId).querySelector('input')?.value;
}

/** The request the games search would send for the current search params. */
function submittedSearchRequest(
    onSearch: ReturnType<typeof vi.fn>,
    startKey = '',
): [Record<string, unknown>, string] {
    const searchFunc = onSearch.mock.calls[0][0] as (startKey: string) => unknown;
    searchFunc(startKey);
    return searchGames.mock.calls[0] as [Record<string, unknown>, string];
}

function renderFilters({ isLoading = false } = {}) {
    const onSearch = vi.fn();
    const result = renderWithIntl(
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <SearchFilters isLoading={isLoading} onSearch={onSearch} />
        </LocalizationProvider>,
    );
    return { ...result, onSearch };
}

beforeEach(() => {
    searchParamsState.value = '';
    authState.user = { dojoCohort: '1500-1600' };
    authState.isFreeTier = false;
    vi.clearAllMocks();
});

afterEach(cleanup);

describe('SearchFilters rendering', () => {
    it('renders the games and position panels', () => {
        renderFilters();

        expect(screen.getByText('Search Games')).toBeInTheDocument();
        expect(screen.getByText('Search By Position')).toBeInTheDocument();
    });

    it('defaults the cohort to the user cohort and selects every result', () => {
        renderFilters();

        expect(combobox('cohort-select')).toHaveTextContent('1500-1600');
        expect(combobox('player-result')).toHaveTextContent('1-0, 0-1, 1/2-1/2');
        expect(screen.getByLabelText('One player')).toBeChecked();
    });

    it('labels the name fields by color until colors are ignored', () => {
        renderFilters();

        expect(screen.getByLabelText('White')).toBeInTheDocument();
        expect(screen.getByLabelText('Black')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Ignore colors'));

        expect(screen.getByLabelText('Player 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Player 2')).toBeInTheDocument();
        expect(screen.queryByLabelText('White')).toBeNull();
    });

    it('disables both buttons while a search is running', () => {
        renderFilters({ isLoading: true });

        expect(screen.getByTestId('search-games-button')).toBeDisabled();
        expect(screen.getByTestId('clear-filters-button')).toBeDisabled();
    });
});

describe('SearchFilters search on mount', () => {
    it('searches games using the current search params', () => {
        searchParamsState.value = new URLSearchParams({
            white: 'Carlsen',
            black: 'Nakamura',
            ignoreColors: 'true',
            minElo: '2700',
            maxElo: '2900',
            eloMode: 'average',
            results: '1-0,1/2-1/2',
            cohort: 'masters',
            opening: 'B12',
            minMoves: '20',
            maxMoves: '60',
            timeClass: 'classical',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-12-31T00:00:00.000Z',
        }).toString();

        const { onSearch } = renderFilters();

        expect(submittedSearchRequest(onSearch, '50')).toEqual([
            {
                white: 'Carlsen',
                black: 'Nakamura',
                ignoreColors: true,
                minElo: '2700',
                maxElo: '2900',
                eloMode: 'average',
                results: '1-0,1/2-1/2',
                cohort: 'masters',
                opening: 'B12',
                minMoves: '20',
                maxMoves: '60',
                timeClass: 'classical',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
            },
            '50',
        ]);
    });

    it('omits empty filters and defaults the elo mode and results', () => {
        authState.user = { dojoCohort: '' };
        const { onSearch } = renderFilters();

        expect(submittedSearchRequest(onSearch)).toEqual([
            {
                white: undefined,
                black: undefined,
                ignoreColors: false,
                minElo: undefined,
                maxElo: undefined,
                eloMode: 'one',
                results: '1-0,0-1,1/2-1/2',
                cohort: undefined,
                opening: undefined,
                minMoves: undefined,
                maxMoves: undefined,
                timeClass: undefined,
                startDate: undefined,
                endDate: undefined,
            },
            '',
        ]);
    });

    it('ignores unknown results and falls back to every result', () => {
        searchParamsState.value = 'results=bogus';
        const { onSearch } = renderFilters();

        expect(submittedSearchRequest(onSearch)[0]).toMatchObject({
            results: '1-0,0-1,1/2-1/2',
        });
        expect(combobox('player-result')).toHaveTextContent('1-0, 0-1, 1/2-1/2');
    });

    it('keeps only the known results when the param is partially valid', () => {
        searchParamsState.value = 'results=1-0,bogus';
        const { onSearch } = renderFilters();

        expect(submittedSearchRequest(onSearch)[0]).toMatchObject({ results: '1-0' });
    });

    it('searches by position when the type param is position', () => {
        searchParamsState.value = 'type=position&fen=8/8/8/8/8/8/8/K6k w - - 0 1';
        const { onSearch } = renderFilters();

        const searchFunc = onSearch.mock.calls[0][0] as (startKey: string) => unknown;
        searchFunc('25');

        expect(searchGames).not.toHaveBeenCalled();
        expect(api.listGamesByPosition).toHaveBeenCalledWith(
            '8/8/8/8/8/8/8/K6k w - - 0 1',
            false,
            '25',
        );
    });
});

describe('SearchFilters submission', () => {
    it('submits the edited filters as search params', () => {
        renderFilters();

        fireEvent.change(screen.getByLabelText('White'), { target: { value: 'Carlsen' } });
        fireEvent.change(screen.getByLabelText('Black'), { target: { value: 'Nakamura' } });
        fireEvent.click(screen.getByLabelText('Ignore colors'));
        fireEvent.change(screen.getByLabelText('Min Rating'), { target: { value: '2700' } });
        fireEvent.click(screen.getByLabelText('Average'));
        fireEvent.change(screen.getByLabelText('Opening'), { target: { value: 'Caro-Kann' } });

        fireEvent.click(screen.getByTestId('search-games-button'));

        const params = {
            type: 'games',
            cohort: '1500-1600',
            white: 'Carlsen',
            black: 'Nakamura',
            ignoreColors: 'true',
            minElo: '2700',
            maxElo: '',
            eloMode: 'average',
            results: '1-0,0-1,1/2-1/2',
            opening: 'Caro-Kann',
            minMoves: '',
            maxMoves: '',
            timeClass: '',
            startDate: '',
            endDate: '',
        };
        expect(setSearchParams).toHaveBeenCalledWith(params);
        expect(trackEvent).toHaveBeenCalledWith('search_games', params);
    });

    it('submits only the selected results', () => {
        renderFilters();

        fireEvent.mouseDown(combobox('player-result'));
        fireEvent.click(within(screen.getByRole('listbox')).getByText('0-1'));
        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

        fireEvent.click(screen.getByTestId('search-games-button'));

        expect(setSearchParams).toHaveBeenCalledWith(
            expect.objectContaining({ results: '1-0,1/2-1/2' }),
        );
    });

    it('resets every filter when clearing', () => {
        searchParamsState.value = new URLSearchParams({
            white: 'Carlsen',
            black: 'Nakamura',
            ignoreColors: 'true',
            minElo: '2700',
            maxElo: '2900',
            eloMode: 'average',
            results: '1-0',
            cohort: 'masters',
            opening: 'B12',
            minMoves: '20',
            maxMoves: '60',
            timeClass: 'classical',
        }).toString();
        renderFilters();

        fireEvent.click(screen.getByTestId('clear-filters-button'));

        expect(screen.getByLabelText('White')).toHaveValue('');
        expect(screen.getByLabelText('Black')).toHaveValue('');
        expect(screen.getByLabelText('Ignore colors')).not.toBeChecked();
        expect(screen.getByLabelText('Min Rating')).toHaveValue(null);
        expect(screen.getByLabelText('Max Rating')).toHaveValue(null);
        expect(screen.getByLabelText('One player')).toBeChecked();
        expect(screen.getByLabelText('Opening')).toHaveValue('');
        expect(selectValue('cohort-select')).toBe('');
        expect(selectValue('player-result')).toBe('1-0,0-1,1/2-1/2');
        expect(selectValue('player-time-class')).toBe('');
    });

    it('requires a FEN before searching by position', () => {
        renderFilters();

        fireEvent.click(screen.getByTestId('fen-search-button'));

        expect(screen.getByText('This field is required')).toBeInTheDocument();
        expect(setSearchParams).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('FEN'), {
            target: { value: '8/8/8/8/8/8/8/K6k w - - 0 1' },
        });
        fireEvent.click(screen.getByTestId('fen-search-button'));

        expect(setSearchParams).toHaveBeenCalledWith({
            type: 'position',
            fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
        });
    });
});
