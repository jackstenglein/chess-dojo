import { GameKey } from '@/database/game';
import { CustomTask, isRequirement, Requirement } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, compareCohorts, dojoCohorts, User } from '@/database/user';
import { StudyItem } from './book';

/** Select the task's cohort using the same rules as the task dialog. */
export function taskCohort(task: Requirement | CustomTask, user: User): string {
    const options = task.counts[ALL_COHORTS] ? dojoCohorts : Object.keys(task.counts);
    if (options.includes(user.dojoCohort)) {
        return user.dojoCohort;
    }
    return [...options].sort(compareCohorts)[0] ?? user.dojoCohort;
}

/**
 * Select the URL's item if it exists. Otherwise select the first item outside the completed
 * range that is owned or has no working copy. Fall back to the first item.
 */
export function chooseCurrent(
    items: StudyItem[],
    urlKey: string | null,
    copies: Map<string, GameKey>,
    passed = new Set<string>(),
): StudyItem | undefined {
    if (items.length === 0) {
        return undefined;
    }
    const fromUrl = urlKey ? items.find((item) => item.key === urlKey) : undefined;
    if (fromUrl) {
        return fromUrl;
    }
    return (
        items.find(
            (item) => !passed.has(item.key) && (item.kind === 'own' || !copies.has(item.key)),
        ) ?? items[0]
    );
}

/** Substitute the cohort's target count into the task name. */
export function taskTitle(task: Requirement | CustomTask, cohort: string): string {
    const count = task.counts[cohort] ?? task.counts[ALL_COHORTS] ?? 0;
    return task.name.replaceAll('{{count}}', String(count));
}

/** The item keys marked done for this task, from the student's timeline. */
export function doneKeys(entries: TimelineEntry[], taskId: string): Set<string> {
    const keys = new Set<string>();
    for (const entry of entries) {
        if (entry.requirementId === taskId && entry.studyInfo?.itemKey) {
            keys.add(entry.studyInfo.itemKey);
        }
    }
    return keys;
}

/**
 * A task read in order, with one count carried across cohorts and either a start above zero or
 * a target that differs by cohort. Custom tasks are never workbooks, and neither is a per-cohort
 * set such as Study Master Games.
 */
export function isWorkbook(task: Requirement | CustomTask): boolean {
    if (!isRequirement(task) || task.numberOfCohorts !== 1) {
        return false;
    }
    if (task.startCount > 0) {
        return true;
    }
    const targets = Object.entries(task.counts)
        .filter(([cohort]) => cohort !== ALL_COHORTS)
        .map(([, count]) => count);
    return new Set(targets).size > 1;
}

/** How a workbook's items relate to its count. Mapped only when the book has one item per unit. */
export interface BookMapping {
    mapped: boolean;
    startCount: number;
    /** The task's unit for the count, lower case. Empty for a set. */
    unit: string;
}

export function bookMapping(task: Requirement | CustomTask, itemCount: number): BookMapping {
    if (!isWorkbook(task)) {
        return { mapped: false, startCount: 0, unit: '' };
    }
    const startCount = task.startCount ?? 0;
    const targets = Object.entries(task.counts)
        .filter(([cohort]) => cohort !== ALL_COHORTS)
        .map(([, count]) => count);
    const end = targets.length > 0 ? Math.max(...targets) : (task.counts[ALL_COHORTS] ?? 0);
    return {
        mapped: itemCount === end - startCount,
        startCount,
        unit: task.progressBarSuffix.trim().toLowerCase(),
    };
}

/**
 * Done counts the item when the task's count is items: a custom task, a task without a suffix,
 * such as Study Master Games, or a workbook whose book maps onto its count. For a task counted
 * in a named unit, such as pages or chapters, Done records the mark and leaves the count as it
 * is, because only the member knows how many of that unit the item was.
 */
export function countsItems(task: Requirement | CustomTask, mapping: BookMapping): boolean {
    return !isRequirement(task) || mapping.mapped || !task.progressBarSuffix.trim();
}

/**
 * The cohort's share of a mapped book, the items from position startCount + 1 through its target.
 */
export function cohortSlice(
    items: StudyItem[],
    task: Requirement | CustomTask,
    cohort: string,
    mapping: BookMapping,
): StudyItem[] {
    if (!mapping.mapped) {
        return items;
    }
    const target = task.counts[cohort] ?? task.counts[ALL_COHORTS] ?? 0;
    return items.slice(0, Math.max(0, target - mapping.startCount));
}

/**
 * The keys the count covers beyond the explicit marks in a mapped book. The count is how many
 * items are done and the marks say which; the earliest unmarked items stand in for the rest,
 * which is progress made before the reader recorded marks.
 */
export function pointerDone(
    items: StudyItem[],
    pointer: number,
    mapping: BookMapping,
    marks: ReadonlySet<string>,
): Set<string> {
    if (!mapping.mapped) {
        return new Set();
    }
    const marked = items.filter((item) => marks.has(item.key)).length;
    let remainder = Math.max(0, pointer - mapping.startCount - marked);
    const keys = new Set<string>();
    for (const item of items) {
        if (remainder === 0) break;
        if (marks.has(item.key)) continue;
        keys.add(item.key);
        remainder -= 1;
    }
    return keys;
}

/** How the reader opens an item: as a game to read or as a puzzle to solve. */
export type StudyMode = { kind: 'read' } | { kind: 'solve'; playBothSides: boolean };

const READ: StudyMode = { kind: 'read' };
const SOLVE: StudyMode = { kind: 'solve', playBothSides: false };
const MEMORIZE: StudyMode = { kind: 'solve', playBothSides: true };
const START_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

/** The PGN's header tags, read from the block before the first blank line. */
function headerTags(pgn: string): Map<string, string> {
    const block = pgn.split(/\r?\n\r?\n/, 1)[0] ?? '';
    const tags = new Map<string, string>();
    for (const match of block.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm)) {
        tags.set(match[1], match[2]);
    }
    return tags;
}

/**
 * The mode an item's own PGN asks for. A StudyMode tag decides when present. Otherwise a
 * position start presets solve and a game from the initial position presets read.
 */
export function presetMode(pgn: string): StudyMode {
    const tags = headerTags(pgn);
    switch (tags.get('StudyMode')?.toLowerCase()) {
        case 'solve':
            return SOLVE;
        case 'read':
            return READ;
        case 'memorize':
            return MEMORIZE;
    }
    const fen = tags.get('FEN') ?? '';
    const positionStart = fen ? !fen.startsWith(START_POSITION) : tags.get('SetUp') === '1';
    return positionStart ? SOLVE : READ;
}

/** The side to move at the PGN's start. */
export function sideToMove(pgn: string): 'white' | 'black' {
    return headerTags(pgn).get('FEN')?.split(' ')[1] === 'b' ? 'black' : 'white';
}

/** The mode after the member's own choice for the item, when there is one. */
export function resolveMode(preset: StudyMode, override?: StudyMode['kind']): StudyMode {
    if (!override || override === preset.kind) {
        return preset;
    }
    return override === 'read' ? READ : SOLVE;
}
