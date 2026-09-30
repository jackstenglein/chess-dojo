/** Units a task's name may mention, matched in its plural form. */
const KNOWN_UNITS = [
    'Games',
    'Exercises',
    'Puzzles',
    'Problems',
    'Positions',
    'Pages',
    'Chapters',
    'Lessons',
    'Videos',
    'Studies',
    'Lines',
    'Tactics',
    'Openings',
    'Endgames',
    'Models',
    'Courses',
    'Books',
];

const UNIT_PATTERN = new RegExp(`\\b(${KNOWN_UNITS.join('|')})\\b`, 'i');

/**
 * Returns what a task counts: its own unit when it has one, or else a unit named in
 * the task ("Study Master Games" counts games). Empty when neither says.
 * @param task The task's unit and name.
 */
export function getTaskUnit(task: { progressBarSuffix?: string; name?: string }): string {
    const suffix = task.progressBarSuffix?.trim();
    if (suffix) {
        return suffix;
    }
    const match = UNIT_PATTERN.exec(task.name ?? '');
    if (!match) {
        return '';
    }
    const word = match[1];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
