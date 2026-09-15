import { Course } from 'src/database/course';

/**
 * Gets the adjacent module by chapter and module index.
 * @param chapterIndex The index of the chapter to select.
 * @param moduleIndex The index of the module to select.
 * @param chapters The chapters of the course.
 * @param direction The direction to get the adjacent module.
 * @returns The adjacent module.
 */
export function getAdjacentModule(
    chapterIndex: number,
    moduleIndex: number,
    chapters: Course['chapters'],
    direction: -1 | 1,
) {
    if (!chapters) {
        return undefined;
    }

    let c = chapterIndex;
    let m = moduleIndex + direction;
    while (c >= 0 && c < chapters.length) {
        const modules = chapters[c].modules ?? [];
        if (m >= 0 && m < modules.length) {
            return {
                chapterIndex: c,
                moduleIndex: m,
                name: modules[m].name,
            };
        }
        c += direction;
        if (c < 0 || c >= chapters.length) {
            return undefined;
        }
        m = direction === 1 ? 0 : (chapters[c].modules?.length ?? 0) - 1;
    }
    return undefined;
}
