import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { render, screen } from '@testing-library/react';
import { DateTime } from 'luxon';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressHistoryList } from './ProgressHistoryList';
import type { HistoryItem } from './progressHistoryEditor';

const virtuosoMock = vi.hoisted(() => ({
    latestProps: undefined as
        | {
              components?: Record<string, unknown>;
              customScrollParent?: HTMLElement;
              data: { item: HistoryItem; itemIndex: number }[];
              initialItemCount?: number;
              itemContent: (
                  index: number,
                  row: { item: HistoryItem; itemIndex: number },
              ) => ReactNode;
              scrollSeekConfiguration?: unknown;
              style?: Record<string, string>;
          }
        | undefined,
}));

vi.mock('react-virtuoso', () => ({
    Virtuoso: (props: typeof virtuosoMock.latestProps) => {
        virtuosoMock.latestProps = props;
        return (
            <div data-testid='virtuoso-list'>
                {props?.data.slice(0, 4).map((row, index) => (
                    <div key={row.item.entry.id}>{props.itemContent(index, row)}</div>
                ))}
            </div>
        );
    },
}));

vi.mock('@mui/material', () => ({
    Box: ({
        children,
        'data-testid': dataTestId,
    }: {
        children?: ReactNode;
        'data-testid'?: string;
    }) => <div data-testid={dataTestId}>{children}</div>,
}));

vi.mock('./ProgressHistoryItem', () => ({
    ProgressHistoryItem: ({ item }: { item: HistoryItem }) => (
        <div data-testid='progress-history-item'>{item.notes}</div>
    ),
}));

const requirement: Requirement = {
    id: 'classical-games',
    status: RequirementStatus.Active,
    category: RequirementCategory.Games,
    name: 'Play Classical Games',
    description: '',
    freeDescription: '',
    counts: { '1400-1500': 40 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 1,
    totalScore: 0,
    scoreboardDisplay: ScoreboardDisplay.Yearly,
    progressBarSuffix: 'games',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sortPriority: 'games',
    expirationDays: -1,
    isFree: false,
    atomic: false,
    expectedMinutes: 0,
};

function makeItem(index: number): HistoryItem {
    const date = new Date(Date.UTC(2026, 0, index + 1, 12)).toISOString();
    const entry: TimelineEntry = {
        owner: 'test',
        id: `entry-${index}`,
        ownerDisplayName: 'Test User',
        cohort: '1400-1500',
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementCategory: RequirementCategory.Games,
        scoreboardDisplay: ScoreboardDisplay.Yearly,
        progressBarSuffix: 'games',
        totalCount: 40,
        previousCount: index,
        newCount: index + 1,
        dojoPoints: 1,
        totalDojoPoints: index + 1,
        minutesSpent: 30,
        totalMinutesSpent: (index + 1) * 30,
        date,
        createdAt: date,
        notes: `notes ${index}`,
        comments: [],
        reactions: {},
    };

    return {
        date: DateTime.fromISO(entry.date || entry.createdAt),
        count: '1',
        hours: '0',
        minutes: '30',
        notes: entry.notes,
        entry,
        index,
        deleted: false,
        cohort: '1400-1500',
        isNew: false,
    };
}

describe('ProgressHistoryList Virtuoso configuration', () => {
    const items = Array.from({ length: 8 }, (_, index) => makeItem(index));

    beforeEach(() => {
        virtuosoMock.latestProps = undefined;
    });

    it('uses the provided scroll parent without scroll-seek placeholders', () => {
        const scrollParent = document.createElement('div');

        render(
            <ProgressHistoryList
                requirement={requirement}
                items={items}
                errors={{}}
                updateItem={vi.fn()}
                updateDraftItem={vi.fn()}
                getDraftItem={() => undefined}
                deleteItem={vi.fn()}
                scrollParent={scrollParent}
            />,
        );

        expect(virtuosoMock.latestProps?.customScrollParent).toBe(scrollParent);
        expect(virtuosoMock.latestProps?.scrollSeekConfiguration).toBeUndefined();
        expect(virtuosoMock.latestProps?.components?.ScrollSeekPlaceholder).toBeUndefined();
        expect(virtuosoMock.latestProps?.style).toBeUndefined();
        expect(virtuosoMock.latestProps?.initialItemCount).toBeGreaterThan(0);
    });

    it('renders pending draft items when virtual rows remount', () => {
        const draftItem = { ...items[7], notes: 'pending draft from virtual row' };

        render(
            <ProgressHistoryList
                requirement={requirement}
                items={items}
                errors={{}}
                updateItem={vi.fn()}
                updateDraftItem={vi.fn()}
                getDraftItem={(index) => (index === 7 ? draftItem : undefined)}
                deleteItem={vi.fn()}
                scrollParent={document.createElement('div')}
            />,
        );

        expect(screen.getByText('pending draft from virtual row')).toBeInTheDocument();
    });
});
