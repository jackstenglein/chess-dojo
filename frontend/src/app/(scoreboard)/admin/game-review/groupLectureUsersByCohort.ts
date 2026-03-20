import { LectureTierUser } from '@/api/liveClassesApi';
import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';

/** Groups lecture tier users by dojoCohort, sorted by cohort range. */
export function groupLectureUsersByCohort(
    users: LectureTierUser[],
): Map<string, LectureTierUser[]> {
    const grouped = new Map<string, LectureTierUser[]>();
    for (const user of users) {
        const cohort = user.dojoCohort || 'Unknown';
        const list = grouped.get(cohort) || [];
        list.push(user);
        grouped.set(cohort, list);
    }
    // Sort keys by the numeric lower bound of the cohort range
    const sorted = new Map(
        [...grouped.entries()].sort(([a], [b]) => {
            const [aVal] = getCohortRangeInt(a);
            const [bVal] = getCohortRangeInt(b);
            if (aVal < 0 && bVal < 0) return 0;
            if (aVal < 0) return 1;
            if (bVal < 0) return -1;
            return aVal - bVal;
        }),
    );
    return sorted;
}
