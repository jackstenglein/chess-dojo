import { Course, CourseModule, CourseModuleType, CourseType } from '@/database/course';
import {
    Directory,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { describe, expect, it } from 'vitest';
import {
    chapterOf,
    concatBooks,
    courseBook,
    directoryBook,
    itemsOf,
    neighbours,
    sliceBook,
} from './book';

function module(overrides: Partial<CourseModule>): CourseModule {
    return {
        id: 'm',
        name: '',
        type: CourseModuleType.PgnViewer,
        description: '',
        postscript: '',
        coach: '',
        videoUrls: [],
        pgns: [],
        positions: [],
        boardOrientation: 'white' as const,
        ...overrides,
    };
}

const course = {
    type: CourseType.Study,
    id: 'study-master-games-1500-1600',
    name: 'Master Games 1500-1600',
    allowExport: false,
    chapters: [
        {
            name: 'Keres vs Smyslov (1939)',
            modules: [module({ id: 'm1', pgns: ['[Event "A"]\n\n1. e4 *'] })],
        },
        {
            name: 'Two games',
            modules: [
                module({
                    id: 'm2',
                    name: 'Pair',
                    pgns: ['[Event "B"]\n\n1. d4 *', '[Event "C"]\n\n1. c4 *'],
                }),
                module({ id: '', pgns: ['[Event "D"]\n\n1. Nf3 *'], boardOrientation: 'black' }),
                module({ id: 'v', type: CourseModuleType.Video, videoUrls: ['x'] }),
            ],
        },
    ],
} as unknown as Course;

function ownedGame(id: string, owner: string, white: string, black: string) {
    return {
        type: DirectoryItemTypes.OWNED_GAME,
        id: `1500-1600/${id}`,
        metadata: {
            cohort: '1500-1600',
            id,
            owner,
            createdAt: '2026-01-01T00:00:00Z',
            white,
            black,
        },
    };
}

const directory = {
    owner: 'student',
    id: 'folder-1',
    parent: 'home',
    name: 'Kasparov',
    visibility: 'PRIVATE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    itemIds: ['sub', '1500-1600/g1', '1500-1600/g2', '1500-1600/g3'],
    items: {
        sub: {
            type: DirectoryItemTypes.DIRECTORY,
            id: 'sub',
            metadata: {
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
                visibility: 'PRIVATE',
                name: 'Sub',
            },
        },
        '1500-1600/g1': ownedGame('g1', 'student', 'Kasparov', 'Karpov'),
        '1500-1600/g2': ownedGame('g2', 'someone-else', 'Tal', 'Botvinnik'),
        '1500-1600/g3': ownedGame('g3', 'student', 'Fischer', 'Spassky'),
    },
} as unknown as Directory;

describe('courseBook', () => {
    const book = courseBook(course);

    it('keeps chapter names and emits one item per PGN, skipping non-PGN modules', () => {
        expect(book.title).toBe('Master Games 1500-1600');
        expect(book.chapters.map((c) => c.name)).toEqual(['Keres vs Smyslov (1939)', 'Two games']);
        expect(itemsOf(book).map((i) => i.name)).toEqual([
            'Keres vs Smyslov (1939)',
            'Pair 1',
            'Pair 2',
            'Two games',
        ]);
    });

    it('keys items by module id and falls back to position without one', () => {
        expect(itemsOf(book).map((i) => i.key)).toEqual([
            'course:STUDY/study-master-games-1500-1600/m1/0',
            'course:STUDY/study-master-games-1500-1600/m2/0',
            'course:STUDY/study-master-games-1500-1600/m2/1',
            'course:STUDY/study-master-games-1500-1600/c1-m1/0',
        ]);
    });

    it('carries the PGN, orientation and export flag', () => {
        const items = itemsOf(book);
        expect(items[0]).toMatchObject({
            kind: 'canonical',
            pgn: '[Event "A"]\n\n1. e4 *',
            orientation: 'white',
            allowExport: false,
        });
        expect(items[3]).toMatchObject({ orientation: 'black' });
        expect(itemsOf(courseBook({ ...course, allowExport: true }))[0]).toMatchObject({
            allowExport: true,
        });
    });
});

describe('directoryBook', () => {
    it("lists only the student's own games, in folder order, named by the players", async () => {
        const book = await directoryBook(directory, 'student');
        expect(book.title).toBe('Kasparov');
        expect(book.chapters).toHaveLength(1);
        expect(itemsOf(book)).toEqual([
            {
                kind: 'own',
                key: 'game:3df1b5ed34db',
                name: 'Kasparov vs Karpov',
                game: { cohort: '1500-1600', id: 'g1' },
            },
            {
                kind: 'own',
                key: 'game:56ba7b1ce10c',
                name: 'Fischer vs Spassky',
                game: { cohort: '1500-1600', id: 'g3' },
            },
        ]);
    });

    it("counts other members' games as skipped and ignores subfolders", async () => {
        const book = await directoryBook(directory, 'student');
        expect(book.skipped).toBe(1);
    });

    it('keys an own game by a hash that names neither its cohort nor its id', async () => {
        const [kasparov, fischer] = itemsOf(await directoryBook(directory, 'student'));
        const [again] = itemsOf(await directoryBook(directory, 'student'));
        expect(kasparov.key).toMatch(/^game:[0-9a-f]{12}$/);
        expect(kasparov.key).not.toMatch(/1500-1600|g1/);
        expect(again.key).toBe(kasparov.key);
        expect(fischer.key).not.toBe(kasparov.key);
    });

    it('has no chapters when nothing qualifies', async () => {
        const empty = await directoryBook(directory, 'stranger');
        expect(empty.chapters).toEqual([]);
        expect(empty.skipped).toBe(3);
    });
});

describe('concatBooks', () => {
    it('reads several books as one, in order, keeping every key', () => {
        const first = {
            title: 'Part 1',
            skipped: 0,
            chapters: [{ name: 'A', items: [item('course:STUDY/p1/m/0')] }],
        };
        const second = {
            title: 'Part 2',
            skipped: 2,
            chapters: [
                { name: 'B', items: [item('course:STUDY/p2/m/0'), item('course:STUDY/p2/m/1')] },
            ],
        };
        const book = concatBooks('Polgar M2', [first, second]);
        expect(book.title).toBe('Polgar M2');
        expect(book.chapters.map((c) => c.name)).toEqual(['A', 'B']);
        expect(itemsOf(book).map((i) => i.key)).toEqual([
            'course:STUDY/p1/m/0',
            'course:STUDY/p2/m/0',
            'course:STUDY/p2/m/1',
        ]);
        expect(book.skipped).toBe(2);
    });
});

function item(key: string) {
    return {
        kind: 'canonical' as const,
        key,
        name: key,
        pgn: '',
        orientation: 'white' as const,
        allowExport: false,
    };
}

describe('sliceBook', () => {
    it('keeps only the given items and drops emptied chapters', () => {
        const book = {
            title: 'T',
            skipped: 0,
            chapters: [
                { name: 'A', items: [item('a1'), item('a2')] },
                { name: 'B', items: [item('b1')] },
            ],
        };
        const sliced = sliceBook(book, [item('a1')]);
        expect(sliced.chapters).toEqual([{ name: 'A', items: [item('a1')] }]);
        expect(book.chapters[0].items).toHaveLength(2);
    });
});

describe('neighbours', () => {
    const book = {
        title: 'T',
        skipped: 0,
        chapters: [
            { name: 'A', items: [item('a1'), item('a2')] },
            { name: 'B', items: [item('b1')] },
        ],
    };

    it('has no prev on the first item and no next on the last', () => {
        expect(neighbours(book, item('a1'))).toEqual({ prev: undefined, next: item('a2') });
        expect(neighbours(book, item('b1'))).toEqual({ prev: item('a2'), next: undefined });
    });

    it('crosses chapters in reading order', () => {
        expect(neighbours(book, item('a2'))).toEqual({ prev: item('a1'), next: item('b1') });
    });

    it('is empty for a one-chapter, one-item book and for an unknown item', () => {
        const single = { title: 'S', skipped: 0, chapters: [{ name: 'S', items: [item('s1')] }] };
        expect(neighbours(single, item('s1'))).toEqual({ prev: undefined, next: undefined });
        expect(neighbours(book, item('zz'))).toEqual({});
    });
});

describe('chapterOf', () => {
    it('finds the chapter holding the item by key', () => {
        const book = {
            title: 'T',
            skipped: 0,
            chapters: [
                { name: 'A', items: [item('a1')] },
                { name: 'B', items: [item('b1'), item('b2')] },
            ],
        };
        expect(chapterOf(book, item('b2'))?.name).toBe('B');
        expect(chapterOf(book, item('a1'))?.name).toBe('A');
        expect(chapterOf(book, item('zz'))).toBeUndefined();
    });
});
