import { CheckCircle, ExpandMore, KeyboardDoubleArrowLeft } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { itemsOf, StudyBook, StudyChapter, StudyItem } from './book';
import { scrollDelta } from './catalogScroll';

export interface StudyCatalogProps {
    book: StudyBook;
    current: StudyItem;
    done: Set<string>;
    workedOn: Set<string>;
    historyComplete: boolean;
    /** Show the total number of games without a completion count. */
    browsing?: boolean;
    /** The count's unit of a workbook, used in the header. Empty for a set. */
    unit?: string;
    /** The task's target in units, given once the session's count has reached it. */
    targetReached?: number;
    onSelect: (item: StudyItem) => void;
    onCollapse?: () => void;
}

/**
 * The book's chapters and games. A book of single games is a plain list; any other book shows
 * every chapter as an accordion.
 */
export function StudyCatalog({
    book,
    current,
    done,
    workedOn,
    historyComplete,
    browsing = false,
    unit,
    targetReached,
    onSelect,
    onCollapse,
}: StudyCatalogProps) {
    const t = useTranslations('study');
    const total = book.chapters.reduce((n, chapter) => n + chapter.items.length, 0);
    const doneIn = (chapter: StudyChapter) =>
        chapter.items.filter((item) => done.has(item.key)).length;
    const doneCount = book.chapters.reduce((n, chapter) => n + doneIn(chapter), 0);

    // The catalog tells chapters apart by position, since a book can repeat a chapter name.
    const currentChapter = book.chapters.findIndex((c) =>
        c.items.some((item) => item.key === current.key),
    );
    // Only the current chapter is open by default. Opening another one lasts for this visit;
    // closing the current one lasts until the member moves into another chapter.
    const [opened, setOpened] = useState<number[]>([]);
    const [collapsed, setCollapsed] = useState<number>();
    if (collapsed !== undefined && collapsed !== currentChapter) {
        setCollapsed(undefined);
    }

    const listRef = useRef<HTMLUListElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    // The list has no height while the board lays out a new item, so a reveal that cannot
    // measure retries on the next frame. Before the board's first layout even that is too
    // early, and the observer below runs the retry once the list has a height.
    const pendingRef = useRef(false);
    const frameRef = useRef(0);
    const revealCurrent = () => {
        const list = listRef.current;
        const row = rowRef.current;
        if (!list || !row) return;
        if (list.clientHeight === 0) {
            pendingRef.current = true;
            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(() => {
                if (pendingRef.current) revealCurrent();
            });
            return;
        }
        pendingRef.current = false;
        list.scrollTop += scrollDelta({
            offset: row.getBoundingClientRect().top - list.getBoundingClientRect().top,
            rowHeight: row.offsetHeight,
            listHeight: list.clientHeight,
        });
    };
    useEffect(revealCurrent, [current.key]);
    useEffect(() => {
        const list = listRef.current;
        if (!list || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(([entry]) => {
            if (entry.contentRect.height > 0 && pendingRef.current) revealCurrent();
        });
        observer.observe(list);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frameRef.current);
        };
    }, []);

    const numbers = new Map(itemsOf(book).map((item, index) => [item.key, index + 1]));
    const row = (item: StudyItem) => {
        const selected = item.key === current.key;
        return (
            <ListItemButton
                key={item.key}
                ref={selected ? rowRef : undefined}
                selected={selected}
                onClick={() => onSelect(item)}
                data-testid='study-item'
                data-item-key={item.key}
                sx={{
                    borderLeft: 3,
                    borderColor: selected ? 'primary.main' : 'transparent',
                    py: 0.75,
                    gap: 1,
                }}
            >
                <Typography sx={{ width: 28, color: 'text.secondary', flexShrink: 0 }}>
                    {numbers.get(item.key)}
                </Typography>
                <ListItemText
                    primary={item.name}
                    slotProps={{
                        primary: {
                            sx: {
                                fontWeight: workedOn.has(item.key) ? 600 : undefined,
                            },
                        },
                    }}
                />
                {!browsing &&
                    (done.has(item.key) ? (
                        <CheckCircle
                            color='success'
                            fontSize='small'
                            data-testid='study-item-done'
                        />
                    ) : (
                        <Box
                            aria-hidden
                            sx={{
                                width: 20,
                                height: 20,
                                flexShrink: 0,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: '50%',
                            }}
                        />
                    ))}
            </ListItemButton>
        );
    };

    // A book of single games reads as a list. In any other book a one-item chapter keeps its
    // header, so it stays closed like the rest.
    const flat = book.chapters.every((c) => c.items.length === 1);
    const chapter = (c: StudyChapter, index: number) => {
        if (flat) {
            return row(c.items[0]);
        }
        const open = index === currentChapter ? collapsed !== index : opened.includes(index);
        return (
            <Accordion
                key={`${index}-${c.name}`}
                expanded={open}
                onChange={(_, expanded) => {
                    if (index === currentChapter) {
                        setCollapsed(expanded ? undefined : index);
                    } else {
                        setOpened(
                            expanded ? [...opened, index] : opened.filter((i) => i !== index),
                        );
                    }
                }}
                disableGutters
                elevation={0}
                square
                // A closed chapter's rows have no height until it has opened.
                slotProps={{
                    transition: {
                        onEntered: index === currentChapter ? revealCurrent : undefined,
                    },
                }}
            >
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography sx={{ flexGrow: 1 }}>{c.name}</Typography>
                    <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', pr: 1 }}
                    >
                        {browsing ? c.items.length : `${doneIn(c)} / ${c.items.length}`}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List disablePadding>{c.items.map(row)}</List>
                </AccordionDetails>
            </Accordion>
        );
    };

    return (
        <Stack data-testid='study-catalog' sx={{ minWidth: 0, minHeight: 0, flexGrow: 1 }}>
            <Stack sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
                <Stack direction='row' sx={{ alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant='h6' sx={{ flexGrow: 1 }}>
                        {book.title}
                    </Typography>
                    {onCollapse && (
                        <IconButton
                            onClick={onCollapse}
                            aria-label={t('catalog.collapse')}
                            data-testid='study-catalog-collapse'
                            size='small'
                            sx={{ mr: -1 }}
                        >
                            <KeyboardDoubleArrowLeft />
                        </IconButton>
                    )}
                </Stack>
                <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                    data-testid='study-catalog-progress'
                >
                    {browsing
                        ? t('catalog.browsing', { total })
                        : unit
                          ? t('catalog.studiedUnit', { done: doneCount, total, unit })
                          : t('catalog.studied', { done: doneCount, total })}
                </Typography>
                {!historyComplete && (
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {t('catalog.historyLoading')}
                    </Typography>
                )}
                {book.skipped > 0 && (
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {t('catalog.skipped', { count: book.skipped })}
                    </Typography>
                )}
                {targetReached !== undefined && unit && (
                    <Typography
                        variant='body2'
                        color='success.main'
                        data-testid='study-target-reached'
                    >
                        {t('session.targetReached', { total: targetReached, unit })}
                    </Typography>
                )}
            </Stack>
            <List
                ref={listRef}
                disablePadding
                sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}
            >
                {book.chapters.map(chapter)}
            </List>
        </Stack>
    );
}
