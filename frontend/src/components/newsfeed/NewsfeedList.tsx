'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { ListNewsfeedResponse } from '@/api/newsfeedApi';
import LoadMoreButton from '@/components/newsfeed/LoadMoreButton';
import NewsfeedItem from '@/components/newsfeed/NewsfeedItem';
import MultipleSelectChip, { MultipleSelectChipOption } from '@/components/ui/MultipleSelectChip';
import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import LoadingPage from '@/loading/LoadingPage';
import Icon, { icons } from '@/style/Icon';
import { Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

type FilterMap = Record<string, (entry: TimelineEntry) => boolean>;

const isGameAnalysisEntry = (entry: TimelineEntry) =>
    entry.requirementCategory === RequirementCategory.Games;

const isGameSubmissionEntry = (entry: TimelineEntry) =>
    entry.requirementId === TimelineSpecialRequirementId.GameSubmission;

export const AllCategoriesFilterName = 'All Categories';

const CategoryFilters: FilterMap = [
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
    RequirementCategory.NonDojo,
].reduce(
    (acc, category) => ({
        ...acc,
        [category]: (entry: TimelineEntry) => entry.requirementCategory === category,
    }),
    {},
);

export const Filters: FilterMap = {
    [AllCategoriesFilterName]: () => true,
    Annotations: isGameSubmissionEntry,
    [RequirementCategory.Games]: (entry) =>
        isGameAnalysisEntry(entry) && !isGameSubmissionEntry(entry),
    ...CategoryFilters,
};
export const FilterOptions = Object.keys(Filters).map((opt) => {
    return {
        value: opt,
        label: opt,
        icon: <Icon name={opt as keyof typeof icons} color='primary' />,
    };
});

function useNewsfeedIds(initialNewsfeedIds: string[]): [string[], (v: string[]) => void] {
    const [newsfeedIds, setNewsfeedIds] = useState(initialNewsfeedIds);

    useEffect(() => {
        let startingIds = initialNewsfeedIds.filter(
            (id) => (localStorage.getItem(`newsfeedId_${id}`) || 'true') === 'true',
        );
        if (startingIds.length === 0) {
            startingIds = initialNewsfeedIds;
        }

        setNewsfeedIds(startingIds);
    }, [initialNewsfeedIds, setNewsfeedIds]);

    const onChange = useCallback(
        (newValue: string[]) => {
            setNewsfeedIds(newValue);

            const removedIds = initialNewsfeedIds.filter((id) => !newValue.includes(id));

            for (const id of removedIds) {
                localStorage.setItem(`newsfeedId_${id}`, 'false');
            }

            for (const id of newValue) {
                localStorage.setItem(`newsfeedId_${id}`, 'true');
            }
        },
        [setNewsfeedIds, initialNewsfeedIds],
    );

    useEffect(() => {
        let startingIds = initialNewsfeedIds.filter(
            (id) => (localStorage.getItem(`newsfeedId_${id}`) || 'true') === 'true',
        );
        if (startingIds.length === 0) {
            startingIds = initialNewsfeedIds;
        }
        setNewsfeedIds(startingIds);
    }, [initialNewsfeedIds]);

    return [newsfeedIds, onChange];
}

const MAX_COMMENTS = 3;

interface NewsfeedListProps {
    initialNewsfeedIds: string[];
    newsfeedIdOptions?: MultipleSelectChipOption[];
    showAdditionalFilters?: boolean;
}

const NewsfeedList: React.FC<NewsfeedListProps> = ({
    initialNewsfeedIds,
    newsfeedIdOptions,
    showAdditionalFilters,
}) => {
    const api = useApi();
    const request = useRequest<ListNewsfeedResponse>();
    const [newsfeedIds, setNewsfeedIds] = useNewsfeedIds(initialNewsfeedIds);
    const [filters, setFilters] = useState<string[]>([AllCategoriesFilterName]);
    const [data, setData] = useState<ListNewsfeedResponse>();
    const [lastStartKey, setLastStartKey] = useState<Record<string, string>>({});
    const handleResponse = useCallback(
        (resp: ListNewsfeedResponse) => {
            setLastStartKey(data?.lastKeys || {});

            const seen: Record<string, boolean> = {};
            const newEntries = (data?.entries || [])
                .concat(
                    resp.entries.sort((lhs, rhs) =>
                        (rhs.date || rhs.createdAt).localeCompare(lhs.date || lhs.createdAt),
                    ),
                )
                .filter((e) => {
                    return seen[e.id] ? false : (seen[e.id] = true);
                });

            setData({
                entries: newEntries,
                lastFetch: resp.lastFetch,
                lastKeys: resp.lastKeys,
            });
        },
        [setLastStartKey, data],
    );

    useEffect(() => {
        if (!request.isSent() && newsfeedIds.length > 0) {
            request.onStart();
            api.listNewsfeed(newsfeedIds)
                .then((resp) => {
                    handleResponse(resp.data);
                    request.onSuccess();
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, newsfeedIds, handleResponse]);

    const reset = request.reset;
    useEffect(() => {
        reset();
        setData(undefined);
        setLastStartKey({});
    }, [newsfeedIds, reset]);

    if ((newsfeedIds.length > 0 && !request.isSent()) || (request.isLoading() && !data)) {
        return <LoadingPage />;
    }

    const onEdit = (entry: TimelineEntry) => {
        const newData = data?.entries ?? [];
        const i = newData.findIndex((e) => e.id === entry.id);

        setData({
            entries: [...newData.slice(0, i), entry, ...newData.slice(i + 1)],
            lastFetch: data?.lastFetch || '',
            lastKeys: data?.lastKeys || {},
        });
    };

    let skipLastFetch = true;
    let startKey = data?.lastKeys || {};
    if (data?.lastFetch && Object.values(data.lastKeys).length > 0) {
        skipLastFetch = false;
    } else if (data?.lastFetch) {
        startKey = lastStartKey;
    }

    const onLoadMore = () => {
        request.onStart();
        api.listNewsfeed(newsfeedIds, skipLastFetch, JSON.stringify(startKey))
            .then((resp) => {
                handleResponse(resp.data);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const setFiltersWrapper = (proposedFilters: string[]) => {
        const addedFilters = proposedFilters.filter((filter) => !filters.includes(filter));

        let finalFilters = [];
        if (addedFilters.includes(AllCategoriesFilterName)) {
            finalFilters = [AllCategoriesFilterName];
        } else {
            finalFilters = proposedFilters.filter((filter) => filter !== AllCategoriesFilterName);
        }

        setFilters(finalFilters);
    };

    let shownEntries = data?.entries ?? [];
    if (showAdditionalFilters) {
        shownEntries = shownEntries.filter((entry) =>
            filters.some((filterKey) => Filters[filterKey]?.(entry)),
        );
    }

    return (
        <Stack spacing={3} data-testid='newsfeed-list'>
            {newsfeedIdOptions !== undefined && (
                <MultipleSelectChip
                    selected={newsfeedIds}
                    setSelected={setNewsfeedIds}
                    options={newsfeedIdOptions}
                    label='Show Posts From'
                    error={newsfeedIds.length === 0}
                />
            )}

            {showAdditionalFilters && (
                <MultipleSelectChip
                    selected={filters}
                    setSelected={setFiltersWrapper}
                    options={FilterOptions}
                    label='Categories'
                    error={filters.length === 0}
                />
            )}

            {shownEntries.map((entry) => (
                <NewsfeedItem
                    key={entry.id}
                    entry={entry}
                    onEdit={onEdit}
                    maxComments={MAX_COMMENTS}
                />
            ))}

            <LoadMoreButton
                request={request}
                since={data?.lastFetch}
                startKey={startKey}
                onLoadMore={onLoadMore}
            />
        </Stack>
    );
};

export default NewsfeedList;
