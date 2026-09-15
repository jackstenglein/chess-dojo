import { CustomTask, Requirement } from '@/database/requirement';
import { Box } from '@mui/material';
import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ProgressHistoryItem } from './ProgressHistoryItem';
import { type HistoryItem, type HistoryItemError } from './progressHistoryEditor';

interface ProgressHistoryListProps {
    requirement: Requirement | CustomTask;
    items: HistoryItem[];
    errors: Record<number, HistoryItemError>;
    updateItem: (index: number, item: HistoryItem) => void;
    updateDraftItem: (index: number, item: HistoryItem) => void;
    getDraftItem: (index: number) => HistoryItem | undefined;
    deleteItem: (index: number) => void;
    scrollParent: HTMLElement | null;
}

interface ProgressHistoryListRow {
    item: HistoryItem;
    itemIndex: number;
}

const emptyHistoryItemError: HistoryItemError = {};
const estimatedRowHeight = 300;
const scrollBufferHeight = estimatedRowHeight * 3;
const initialRenderRowCount = 4;

export function ProgressHistoryList({
    requirement,
    items,
    errors,
    updateItem,
    updateDraftItem,
    getDraftItem,
    deleteItem,
    scrollParent,
}: ProgressHistoryListProps) {
    const rows = useMemo(
        () =>
            items
                .map((item, itemIndex) => ({ item, itemIndex }))
                .filter(({ item }) => !item.deleted)
                .reverse(),
        [items],
    );

    const renderRow = (row: ProgressHistoryListRow) => {
        const item = getDraftItem(row.itemIndex) ?? row.item;

        return (
            <Box key={item.entry.id} data-testid='task-history-virtual-row'>
                <ProgressHistoryItem
                    requirement={requirement}
                    item={item}
                    error={errors[row.itemIndex] ?? emptyHistoryItemError}
                    itemIndex={row.itemIndex}
                    updateItem={updateItem}
                    updateDraftItem={updateDraftItem}
                    deleteItem={deleteItem}
                />
            </Box>
        );
    };

    return (
        <Box data-testid='task-history-virtual-list' sx={{ width: 1 }}>
            {scrollParent ? (
                <Virtuoso<ProgressHistoryListRow>
                    customScrollParent={scrollParent}
                    data={rows}
                    computeItemKey={(_, row) => row.item.entry.id}
                    defaultItemHeight={estimatedRowHeight}
                    increaseViewportBy={{ top: scrollBufferHeight, bottom: scrollBufferHeight }}
                    initialItemCount={Math.min(rows.length, initialRenderRowCount)}
                    minOverscanItemCount={{ top: 3, bottom: 6 }}
                    itemContent={(_, row) => renderRow(row)}
                />
            ) : (
                rows.slice(0, initialRenderRowCount).map(renderRow)
            )}
        </Box>
    );
}
