import { ListGamesResponse } from '@/api/gameApi';
import { RequestStatus } from '@/api/Request';
import { GameInfo } from '@/database/game';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { SearchFunc, usePagination } from './usePagination';

vi.mock('@/hooks/useNextSearchParams', () => ({
    useNextSearchParams: (defaultInit?: Record<string, string>) => ({
        searchParams: new URLSearchParams(defaultInit),
        setSearchParams: vi.fn(),
        updateSearchParams: vi.fn(),
    }),
}));

function game(id: string): GameInfo {
    return { cohort: 'masters', id } as GameInfo;
}

function response(games: GameInfo[], lastEvaluatedKey?: string) {
    return { data: { games, lastEvaluatedKey } } as AxiosResponse<ListGamesResponse>;
}

/** A search whose single response is resolved or rejected by the test. */
function heldSearch() {
    const { promise, resolve, reject } = Promise.withResolvers<AxiosResponse<ListGamesResponse>>();
    const search = vi.fn<SearchFunc>(() => promise);
    return { search, resolve, reject };
}

describe('usePagination', () => {
    it('ignores the response of a search replaced while it was loading', async () => {
        const oldSearch = heldSearch();
        const newSearch = vi
            .fn<SearchFunc>()
            .mockResolvedValueOnce(response([game('new-1')], 'new-cursor'))
            .mockResolvedValueOnce(response([game('new-2')]));
        // With a page size of 1, the hook loads a second page on its own.
        const { result } = renderHook(() => usePagination(oldSearch.search, 0, 1));
        await waitFor(() => expect(oldSearch.search).toHaveBeenCalledWith(''));

        act(() => result.current.onSearch(newSearch));
        await waitFor(() => expect(result.current.data).toEqual([game('new-1'), game('new-2')]));
        expect(newSearch.mock.calls).toEqual([[''], ['new-cursor']]);

        await act(async () => {
            oldSearch.resolve(response([game('old')], 'old-cursor'));
            await Promise.resolve();
        });

        expect(result.current.data).toEqual([game('new-1'), game('new-2')]);
        expect(result.current.request.status).toBe(RequestStatus.Success);
        expect(newSearch).not.toHaveBeenCalledWith('old-cursor');
    });

    it('ignores the failure of a search replaced while it was loading', async () => {
        const oldSearch = heldSearch();
        const newSearch = heldSearch();
        const { result } = renderHook(() => usePagination(oldSearch.search, 0, 10));
        await waitFor(() => expect(oldSearch.search).toHaveBeenCalled());

        act(() => result.current.onSearch(newSearch.search));
        await waitFor(() => expect(newSearch.search).toHaveBeenCalled());

        await act(async () => {
            oldSearch.reject(new Error('stale'));
            await Promise.resolve();
        });
        expect(result.current.request.status).toBe(RequestStatus.Loading);

        await act(async () => {
            newSearch.resolve(response([game('new')]));
            await Promise.resolve();
        });
        expect(result.current.data).toEqual([game('new')]);
    });
});
