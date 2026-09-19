import { Course } from 'src/database/course';
import { describe, expect, it } from 'vitest';
import { getAdjacentModule } from './courseUtils';

function chapters(...moduleNameLists: string[][]): NonNullable<Course['chapters']> {
    return moduleNameLists.map((names, i) => ({
        name: `Chapter ${i}`,
        modules: names.map((name) => ({ name })),
    })) as NonNullable<Course['chapters']>;
}

describe('getAdjacentModule', () => {
    describe('missing or empty chapters', () => {
        it('returns undefined when chapters is undefined', () => {
            expect(getAdjacentModule(0, 0, undefined, 1)).toBeUndefined();
            expect(getAdjacentModule(0, 0, undefined, -1)).toBeUndefined();
        });

        it('returns undefined when chapters is empty', () => {
            expect(getAdjacentModule(0, 0, [], 1)).toBeUndefined();
            expect(getAdjacentModule(0, 0, [], -1)).toBeUndefined();
        });
    });

    describe('next module (direction 1)', () => {
        const course = chapters(['A1', 'A2'], ['B1', 'B2', 'B3']);

        it('returns the next module in the same chapter', () => {
            expect(getAdjacentModule(0, 0, course, 1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 1,
                name: 'A2',
            });
            expect(getAdjacentModule(1, 0, course, 1)).toEqual({
                chapterIndex: 1,
                moduleIndex: 1,
                name: 'B2',
            });
        });

        it('returns the first module of the next chapter from the last module', () => {
            expect(getAdjacentModule(0, 1, course, 1)).toEqual({
                chapterIndex: 1,
                moduleIndex: 0,
                name: 'B1',
            });
        });

        it('returns undefined at the last module of the last chapter', () => {
            expect(getAdjacentModule(1, 2, course, 1)).toBeUndefined();
        });

        it('returns undefined for a single-module course', () => {
            expect(getAdjacentModule(0, 0, chapters(['Only']), 1)).toBeUndefined();
        });
    });

    describe('previous module (direction -1)', () => {
        const course = chapters(['A1', 'A2'], ['B1', 'B2', 'B3']);

        it('returns the previous module in the same chapter', () => {
            expect(getAdjacentModule(0, 1, course, -1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 0,
                name: 'A1',
            });
            expect(getAdjacentModule(1, 2, course, -1)).toEqual({
                chapterIndex: 1,
                moduleIndex: 1,
                name: 'B2',
            });
        });

        it('returns the last module of the previous chapter from the first module', () => {
            expect(getAdjacentModule(1, 0, course, -1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 1,
                name: 'A2',
            });
        });

        it('returns undefined at the first module of the first chapter', () => {
            expect(getAdjacentModule(0, 0, course, -1)).toBeUndefined();
        });

        it('returns undefined for a single-module course', () => {
            expect(getAdjacentModule(0, 0, chapters(['Only']), -1)).toBeUndefined();
        });
    });

    describe('empty chapters', () => {
        it('skips an empty chapter when going forward', () => {
            const course = chapters(['A1'], [], ['C1', 'C2']);
            expect(getAdjacentModule(0, 0, course, 1)).toEqual({
                chapterIndex: 2,
                moduleIndex: 0,
                name: 'C1',
            });
        });

        it('skips consecutive empty chapters when going forward', () => {
            const course = chapters(['A1'], [], [], ['D1']);
            expect(getAdjacentModule(0, 0, course, 1)).toEqual({
                chapterIndex: 3,
                moduleIndex: 0,
                name: 'D1',
            });
        });

        it('skips an empty chapter when going backward', () => {
            const course = chapters(['A1', 'A2'], [], ['C1']);
            expect(getAdjacentModule(2, 0, course, -1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 1,
                name: 'A2',
            });
        });

        it('skips consecutive empty chapters when going backward', () => {
            const course = chapters(['A1'], [], [], ['D1']);
            expect(getAdjacentModule(3, 0, course, -1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 0,
                name: 'A1',
            });
        });

        it('returns undefined when remaining chapters are empty going forward', () => {
            expect(getAdjacentModule(0, 0, chapters(['A1'], [], []), 1)).toBeUndefined();
        });

        it('returns undefined when remaining chapters are empty going backward', () => {
            expect(getAdjacentModule(2, 0, chapters([], [], ['C1']), -1)).toBeUndefined();
        });

        it('treats missing modules as empty', () => {
            const course = [
                { name: 'Chapter 0', modules: [{ name: 'A1' }] },
                { name: 'Chapter 1' },
                { name: 'Chapter 2', modules: [{ name: 'C1' }] },
            ] as Course['chapters'];

            expect(getAdjacentModule(0, 0, course, 1)).toEqual({
                chapterIndex: 2,
                moduleIndex: 0,
                name: 'C1',
            });
            expect(getAdjacentModule(2, 0, course, -1)).toEqual({
                chapterIndex: 0,
                moduleIndex: 0,
                name: 'A1',
            });
        });
    });

    describe('out-of-range starting index', () => {
        const course = chapters(['A1', 'A2'], ['B1']);

        it('returns undefined when chapterIndex is out of bounds', () => {
            expect(getAdjacentModule(-1, 0, course, 1)).toBeUndefined();
            expect(getAdjacentModule(2, 0, course, 1)).toBeUndefined();
            expect(getAdjacentModule(-1, 0, course, -1)).toBeUndefined();
            expect(getAdjacentModule(2, 0, course, -1)).toBeUndefined();
        });
    });
});
