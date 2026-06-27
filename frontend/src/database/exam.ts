import { ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';

export { ExamType } from '@jackstenglein/chess-dojo-common/src/database/exam';

/**
 * Returns a display string for the given Exam type.
 * @param type The type of the Exam.
 * @returns A display string for the Exam type.
 */
export function displayExamType(type: ExamType, t: (key: string) => string): string {
    switch (type) {
        case ExamType.Tactics:
            return t('tacticsTest');
        case ExamType.Polgar:
            return t('checkmateTest');
        case ExamType.Endgame:
            return t('endgameTest');
    }
}
