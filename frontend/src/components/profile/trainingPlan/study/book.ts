import { Course } from '@/database/course';
import { GameKey } from '@/database/game';
import {
    Directory,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { shortHash } from './copies';

/** A game from a course, shown from the course's PGN until the student has a copy. */
export interface CanonicalItem {
    kind: 'canonical';
    key: string;
    name: string;
    pgn: string;
    orientation: 'white' | 'black';
    allowExport: boolean;
}

/** A game the student owns, opened and saved in place. */
export interface OwnItem {
    kind: 'own';
    key: string;
    name: string;
    game: GameKey;
}

export type StudyItem = CanonicalItem | OwnItem;

export interface StudyChapter {
    name: string;
    items: StudyItem[];
}

export interface StudyBook {
    title: string;
    chapters: StudyChapter[];
    /** Folder games that are not the student's own and so are left out. */
    skipped: number;
}

/**
 * Identify a course game by module ID and PGN index. Without a module ID, use the
 * chapter and module positions, which change when the course is reordered.
 */
function courseItemKey(
    course: Pick<Course, 'type' | 'id'>,
    moduleId: string | undefined,
    chapterIndex: number,
    moduleIndex: number,
    pgnIndex: number,
): string {
    const moduleKey = moduleId || `c${chapterIndex}-m${moduleIndex}`;
    return `course:${course.type}/${course.id}/${moduleKey}/${pgnIndex}`;
}

/**
 * The key is a hash of the cohort and id, so a done mark on the public timeline never names
 * the game.
 */
async function gameItemKey(game: GameKey): Promise<string> {
    return `game:${await shortHash(`${game.cohort}/${game.id}`)}`;
}

export function courseBook(course: Course): StudyBook {
    const chapters: StudyChapter[] = [];
    course.chapters?.forEach((chapter, chapterIndex) => {
        const items: StudyItem[] = [];
        chapter.modules.forEach((module, moduleIndex) => {
            const pgns = module.pgns?.filter((pgn) => pgn.trim() !== '') ?? [];
            pgns.forEach((pgn, pgnIndex) => {
                const base = module.name || chapter.name;
                items.push({
                    kind: 'canonical',
                    key: courseItemKey(course, module.id, chapterIndex, moduleIndex, pgnIndex),
                    name: pgns.length > 1 ? `${base} ${pgnIndex + 1}` : base,
                    pgn,
                    orientation: module.boardOrientation || 'white',
                    allowExport: course.allowExport ?? false,
                });
            });
        });
        if (items.length > 0) {
            chapters.push({ name: chapter.name, items });
        }
    });
    return { title: course.name, chapters, skipped: 0 };
}

export async function directoryBook(directory: Directory, username: string): Promise<StudyBook> {
    const items: StudyItem[] = [];
    let skipped = 0;
    for (const id of directory.itemIds) {
        const item = directory.items[id];
        if (!item || item.type === DirectoryItemTypes.DIRECTORY) {
            continue;
        }
        if (item.type !== DirectoryItemTypes.OWNED_GAME || item.metadata.owner !== username) {
            skipped += 1;
            continue;
        }
        const game = { cohort: item.metadata.cohort, id: item.metadata.id };
        items.push({
            kind: 'own',
            key: await gameItemKey(game),
            name: `${item.metadata.white} vs ${item.metadata.black}`,
            game,
        });
    }
    return {
        title: directory.name,
        chapters: items.length > 0 ? [{ name: directory.name, items }] : [],
        skipped,
    };
}

export function itemsOf(book: StudyBook): StudyItem[] {
    return book.chapters.flatMap((chapter) => chapter.items);
}

/**
 * Combine books in material order. Preserve item keys, which already include the course.
 */
export function concatBooks(title: string, books: StudyBook[]): StudyBook {
    return {
        title,
        chapters: books.flatMap((book) => book.chapters),
        skipped: books.reduce((n, book) => n + book.skipped, 0),
    };
}

/** Keep the given items in book order and remove empty chapters. */
export function sliceBook(book: StudyBook, items: StudyItem[]): StudyBook {
    const keep = new Set(items.map((item) => item.key));
    const chapters = book.chapters
        .map((chapter) => ({
            ...chapter,
            items: chapter.items.filter((item) => keep.has(item.key)),
        }))
        .filter((chapter) => chapter.items.length > 0);
    return { ...book, chapters };
}

/** The chapter holding the item, matched by key. */
export function chapterOf(book: StudyBook, item: StudyItem): StudyChapter | undefined {
    return book.chapters.find((chapter) => chapter.items.some((i) => i.key === item.key));
}

/** The items before and after the current one in reading order, across chapters. */
export function neighbours(
    book: StudyBook,
    current: StudyItem,
): { prev?: StudyItem; next?: StudyItem } {
    const items = itemsOf(book);
    const index = items.findIndex((item) => item.key === current.key);
    if (index < 0) {
        return {};
    }
    return { prev: items[index - 1], next: items[index + 1] };
}
