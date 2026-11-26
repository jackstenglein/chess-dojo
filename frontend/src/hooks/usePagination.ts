import { Request, RequestStatus, useRequest } from '@/api/Request';
import { ListGamesResponse } from '@/api/gameApi';
import { GameInfo, GameKey } from '@/database/game';
import { AxiosResponse } from 'axios';
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { useNextSearchParams } from './useNextSearchParams';

export type SearchFunc = (startKey: string) => Promise<AxiosResponse<ListGamesResponse>>;

type FilterFunc = (game: GameInfo) => boolean;

export interface PaginationResult {
    page: number;
    pageSize: number;
    data: GameInfo[];
    request: Request;
    rowCount: number;
    hasMore: boolean;
    setGames: Dispatch<SetStateAction<GameInfo[]>>;
    setPage: (newPage: number) => void;
    setPageSize: (newPageSize: number) => void;
    onSearch: (searchFunc: SearchFunc) => void;
    onDelete: (keys: GameKey[]) => void;
}

export function usePagination(
    initialSearchFunc: SearchFunc | null,
    initialPage: number,
    initialPageSize: number,
    filterFunc?: FilterFunc,
): PaginationResult {
    const request = useRequest();
    const reset = request.reset;

    const { searchParams, updateSearchParams } = useNextSearchParams({
        page: `${initialPage}`,
        pageSize: `${initialPageSize}`,
    });

    const [games, setGames] = useState<GameInfo[]>([]);
    const [startKey, setStartKey] = useState<string | undefined>('');
    const [searchFunc, setSearchFunc] = useState<SearchFunc | null>(() => initialSearchFunc);
    // Incremented by onSearch so responses from earlier searches are ignored.
    const searchId = useRef(0);

    const page = parseInt(searchParams.get('page') || `${initialPage}`);
    const pageSize = parseInt(searchParams.get('pageSize') || `${initialPageSize}`);

    const onChangePage = useCallback(
        (newPage: number) => {
            reset();
            updateSearchParams({ page: `${newPage}` }, { scroll: false });
        },
        [reset, updateSearchParams],
    );

    const onChangePageSize = useCallback(
        (newPageSize: number) => {
            const newPage = Math.floor((page * pageSize) / newPageSize);
            updateSearchParams(
                { page: `${newPage}`, pageSize: `${newPageSize}` },
                { scroll: false },
            );
        },
        [updateSearchParams, page, pageSize],
    );

    const onSearch = useCallback(
        (searchFunc: SearchFunc) => {
            searchId.current++;
            reset();
            setGames([]);
            setStartKey('');
            setSearchFunc(() => searchFunc);
        },
        [reset, setGames, setStartKey, setSearchFunc],
    );

    const onDelete = useCallback(
        (keys: GameKey[]) => {
            setGames((gs) =>
                gs.filter((g) => {
                    const key = keys.find((key) => key.cohort === g.cohort && key.id === g.id);
                    return !key;
                }),
            );
        },
        [setGames],
    );

    useEffect(() => {
        // The search function is not set yet
        if (searchFunc === null) {
            return;
        }

        // We have already fetched this page of data and don't need to refetch
        if (games.length > (page + 1) * pageSize) {
            return;
        }

        // There are no more pages to fetch
        if (startKey === undefined) {
            return;
        }

        // The request is already sent and we don't want to duplicate it
        if (request.isLoading() || request.status === RequestStatus.Failure) {
            return;
        }

        // We need to fetch the next page
        request.onStart();
        const currentSearchId = searchId.current;

        searchFunc(startKey)
            .then((response) => {
                if (currentSearchId !== searchId.current) {
                    return;
                }
                request.onSuccess();
                const newGames = filterFunc
                    ? response.data.games.filter(filterFunc)
                    : response.data.games;
                setGames(games.concat(newGames));
                setStartKey(response.data.lastEvaluatedKey);
            })
            .catch((err) => {
                if (currentSearchId !== searchId.current) {
                    return;
                }
                request.onFailure(err);
            });
    }, [page, pageSize, games, startKey, searchFunc, filterFunc, request]);

    const rowCount = games.length;

    return {
        page,
        pageSize,
        data: games,
        request,
        rowCount,
        hasMore: startKey !== undefined,
        setGames,
        setPage: onChangePage,
        setPageSize: onChangePageSize,
        onSearch,
        onDelete,
    };
}
