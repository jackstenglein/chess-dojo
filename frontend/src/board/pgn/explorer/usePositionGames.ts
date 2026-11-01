import { useApi } from '@/api/Api';
import { ListGamesResponse } from '@/api/gameApi';
import { useRequest } from '@/api/Request';
import { dojoCohorts } from '@/database/user';
import { PaginationResult } from '@/hooks/usePagination';
import { FEN } from '@jackstenglein/chess';
import { useEffect, useRef, useState } from 'react';
import { ExplorerDatabaseType } from './Explorer';

export function usePositionGames({
    fen,
    type,
    minCohort,
    maxCohort,
    timeControls,
}: {
    fen: string;
    type: ExplorerDatabaseType;
    minCohort: string;
    maxCohort: string;
    timeControls: string[];
}): PaginationResult {
    const api = useApi();
    const request = useRequest();
    const reset = request.reset;
    const cache = useRef(new Map<string, ListGamesResponse>());
    // Cache keys with a request in flight. A key can still be pending after the filters change
    // away and back, and sending it again would append the same page twice.
    const pendingKeys = useRef(new Set<string>());
    // The cache key being displayed. Only its response may settle `request`.
    const displayedKey = useRef('');

    const timeControlsKey = timeControls.join(',');
    const cacheKey =
        type === ExplorerDatabaseType.Masters
            ? `${fen}|${type}|${timeControlsKey}`
            : `${fen}|${type}`;

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (fen !== FEN.start) {
            reset();
        }
    }, [fen, reset]);

    useEffect(() => {
        if (type === ExplorerDatabaseType.Dojo || type === ExplorerDatabaseType.Masters) {
            reset();
        }
    }, [type, timeControlsKey, reset]);

    useEffect(() => {
        displayedKey.current = cacheKey;
    }, [cacheKey]);

    const current = cache.current.get(cacheKey);

    const games = (current?.games ?? []).filter((g) => {
        if (type === ExplorerDatabaseType.Dojo) {
            if (minCohort && dojoCohorts.indexOf(minCohort) > dojoCohorts.indexOf(g.cohort)) {
                return false;
            }
            if (maxCohort && dojoCohorts.indexOf(maxCohort) < dojoCohorts.indexOf(g.cohort)) {
                return false;
            }
        }
        return true;
    });

    const onChangePageModel = (newPage: number, newPageSize: number) => {
        if (type !== ExplorerDatabaseType.Dojo && type !== ExplorerDatabaseType.Masters) {
            return;
        }

        setPage(newPage);
        setPageSize(newPageSize);
        if (games.length > (newPage + 2) * newPageSize) {
            return; // Already have enough data to support this page, plus one extra.
        }
        reset();
    };

    useEffect(() => {
        if (type !== ExplorerDatabaseType.Dojo && type !== ExplorerDatabaseType.Masters) {
            return;
        }
        if (fen === FEN.start) {
            return;
        }
        if (type === ExplorerDatabaseType.Masters && timeControls.length === 0) {
            return;
        }

        const currentType = cache.current.get(cacheKey);
        if (games.length > (page + 2) * pageSize) {
            return; // Already have enough data to support this page, plus one extra.
        }
        if (currentType && !currentType.lastEvaluatedKey) {
            return; // There are no more pages to fetch
        }
        if (request.isSent()) {
            return;
        }

        request.onStart();
        if (pendingKeys.current.has(cacheKey)) {
            return; // Its response settles the request.
        }
        pendingKeys.current.add(cacheKey);
        api.listGamesByPosition(
            fen,
            type === ExplorerDatabaseType.Masters,
            currentType?.lastEvaluatedKey,
            type === ExplorerDatabaseType.Masters ? { timeControls } : undefined,
        )
            .then((resp) => {
                pendingKeys.current.delete(cacheKey);
                cache.current.set(cacheKey, {
                    games: (cache.current.get(cacheKey)?.games ?? []).concat(resp.data.games),
                    lastEvaluatedKey: resp.data.lastEvaluatedKey,
                });
                if (displayedKey.current === cacheKey) {
                    request.onSuccess();
                }
            })
            .catch((err: unknown) => {
                pendingKeys.current.delete(cacheKey);
                if (displayedKey.current === cacheKey) {
                    request.onFailure(err);
                }
            });
    }, [page, pageSize, cache, request, api, fen, type, games, cacheKey, timeControls]);

    return {
        page,
        setPage: (newPage: number) => onChangePageModel(newPage, pageSize),
        pageSize,
        setPageSize: (newPageSize: number) => onChangePageModel(page, newPageSize),
        data: games,
        request,
        hasMore: current?.lastEvaluatedKey !== undefined,
        rowCount: games.length,
        setGames: () => null,
        onSearch: () => null,
        onDelete: () => null,
    };
}
