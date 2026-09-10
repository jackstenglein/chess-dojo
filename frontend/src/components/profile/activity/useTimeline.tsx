import { Request, useRequest } from '@/api/Request';
import { listUserTimeline } from '@/api/userApi';
import { TimelineEntry } from '@/database/timeline';
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

export interface UseTimelineResponse {
    owner: string;
    request: Request;
    entries: TimelineEntry[];
    hasMore: boolean;
    onLoadMore: () => void;
    resetRequest: () => void;
    onEdit: (i: number, entry: TimelineEntry) => void;
    onNewEntry: (entry: TimelineEntry) => void;
    onEditEntries: (entries: TimelineEntry[]) => void;
    onDeleteEntries: (entries: TimelineEntry[]) => void;
}

const TimelineContext = createContext<UseTimelineResponse | undefined>(undefined);
export const useTimelineContext = () => {
    const context = useContext(TimelineContext);
    if (!context) {
        throw new Error('useTimelineContext must be used within a TimelineProvider');
    }
    return context;
};

interface TimelineProviderProps {
    owner: string;
    enabled?: boolean;
    children: ReactNode;
}

export const TimelineProvider: React.FC<TimelineProviderProps> = ({
    owner,
    enabled = true,
    children,
}) => {
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [startKey, setStartKey] = useState<string>();
    const request = useRequest();
    const lastYearFetched = useRef(false);

    const { onStart, onSuccess, onFailure } = request;

    const fetchEntriesForLastYear = useCallback(
        async (owner: string, startKey?: string) => {
            try {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                const oneYearAgoStr = oneYearAgo.toISOString();

                const newEntries: TimelineEntry[] = [];
                do {
                    onStart();
                    lastYearFetched.current = true;
                    const response = await listUserTimeline(owner, startKey);
                    newEntries.push(...response.entries);
                    startKey = response.lastEvaluatedKey;

                    if (
                        newEntries.length > 0 &&
                        newEntries[newEntries.length - 1].createdAt < oneYearAgoStr
                    ) {
                        break;
                    }
                } while (startKey);

                onSuccess();
                setEntries(
                    newEntries.sort((a, b) =>
                        (b.date || b.createdAt).localeCompare(a.date || a.createdAt),
                    ),
                );
                setStartKey(startKey);
            } catch (err) {
                onFailure(err);
            }
        },
        [setEntries, setStartKey, onStart, onSuccess, onFailure],
    );

    useEffect(() => {
        if (enabled && owner && !request.isSent()) {
            void fetchEntriesForLastYear(owner, startKey);
        }
    }, [enabled, owner, request, fetchEntriesForLastYear, startKey]);

    const reset = request.reset;

    const onLoadMore = useCallback(() => {
        reset();
    }, [reset]);

    const resetRequest = useCallback(() => {
        setStartKey(undefined);
        setEntries([]);
        reset();
    }, [reset, setStartKey]);

    const onEdit = useCallback(
        (i: number, entry: TimelineEntry) => {
            setEntries((e) => [...e.slice(0, i), entry, ...e.slice(i + 1)]);
        },
        [setEntries],
    );

    const onNewEntry = useCallback(
        (entry: TimelineEntry) => {
            setEntries((e) =>
                [entry, ...e].sort((a, b) =>
                    (b.date || b.createdAt).localeCompare(a.date || a.createdAt),
                ),
            );
        },
        [setEntries],
    );

    const onEditEntries = useCallback(
        (entries: TimelineEntry[]) => {
            setEntries((currentEntries) => {
                const editedEntriesMap = entries.reduce<Record<string, TimelineEntry>>((acc, e) => {
                    acc[e.id] = e;
                    return acc;
                }, {});
                const originalEntrySet = new Set<string>();
                for (const e of currentEntries) {
                    originalEntrySet.add(e.id);
                }

                const updatedEntries = currentEntries.map((e) => editedEntriesMap[e.id] ?? e);
                const newEntries = entries.filter((e) => !originalEntrySet.has(e.id));
                return updatedEntries
                    .concat(newEntries)
                    .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));
            });
        },
        [setEntries],
    );

    const onDeleteEntries = useCallback(
        (entries: TimelineEntry[]) => {
            setEntries((currentEntries) =>
                currentEntries.filter((e) => !entries.some((e2) => e.id === e2.id)),
            );
        },
        [setEntries],
    );

    const timelineData = {
        owner,
        request,
        entries,
        hasMore: startKey !== undefined,
        onLoadMore,
        resetRequest,
        onEdit,
        onNewEntry,
        onEditEntries,
        onDeleteEntries,
    };

    return <TimelineContext.Provider value={timelineData}>{children}</TimelineContext.Provider>;
};
