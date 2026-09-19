import {
    Chapter,
    Coach,
    Course,
    CourseModule,
    CourseModuleType,
    CoursePurchaseOption,
    CourseSellingPoint,
    CourseStatus,
    CourseType,
} from '@/database/course';
import { Position } from '@/database/requirement';
import { ALL_COHORTS, compareCohorts, dojoCohorts, User } from '@/database/user';
import { v4 as uuidv4 } from 'uuid';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const MODULE_TYPE_LABELS: Record<CourseModuleType, string> = {
    [CourseModuleType.Video]: 'Video',
    [CourseModuleType.PgnViewer]: 'PGN viewer',
    [CourseModuleType.SparringPositions]: 'Sparring positions',
    [CourseModuleType.ModelGames]: 'Model games',
    [CourseModuleType.Themes]: 'Themes',
    [CourseModuleType.Exercises]: 'Exercises',
};

export function emptyCourse(user: User): Course {
    return {
        owner: user.username,
        ownerDisplayName: user.displayName,
        stripeId: '',
        type: CourseType.Opening,
        id: '',
        name: '',
        description: '',
        whatsIncluded: [],
        color: 'None',
        cohorts: [],
        cohortRange: '',
        includedWithSubscription: false,
        availableForFreeUsers: true,
        purchaseOptions: [],
        chapters: [],
        imageUrl: '',
        videoUrl: '',
        status: CourseStatus.Draft,
    };
}

export function emptyChapter(): Chapter {
    return {
        name: '',
        modules: [emptyModule()],
    };
}

export function emptyModule(): CourseModule {
    return {
        id: uuidv4(),
        name: '',
        type: CourseModuleType.Video,
        description: '',
        postscript: '',
        videoUrls: [''],
        pgns: [],
        coach: Coach.Jesse,
        positions: [],
        boardOrientation: 'white',
    };
}

export function emptyPurchaseOption(): CoursePurchaseOption {
    return {
        name: '',
        fullPrice: 0,
        currentPrice: 0,
        sellingPoints: [],
    };
}

export function emptySellingPoint(): CourseSellingPoint {
    return { description: '', included: true };
}

export function emptyPosition(): Position {
    return {
        title: '',
        fen: STARTING_FEN,
        limitSeconds: 0,
        incrementSeconds: 0,
        result: '',
        videoUrl: '',
    };
}

export function moveItem<T>(items: T[], index: number, delta: number): T[] {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
    }
    const copy = [...items];
    const [item] = copy.splice(index, 1);
    copy.splice(nextIndex, 0, item);
    return copy;
}

export function replaceItem<T>(items: T[] | undefined, index: number, item: T): T[] {
    if (!items) {
        return [item];
    }
    return items.map((current, i) => (i === index ? item : current));
}

export function removeItem<T>(items: T[] | undefined, index: number): T[] {
    if (!items) {
        return [];
    }
    return items.filter((_, i) => i !== index);
}

export function cohortRangeFromCohorts(cohorts: string[]): string {
    const resolved = resolveCohorts(cohorts);
    if (resolved.length === 0) {
        return '';
    }
    const sorted = [...resolved].sort(compareCohorts);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first === last) {
        return first;
    }
    const min = first.split('-')[0];
    if (last.endsWith('+')) {
        return `${min}+`;
    }

    const max = last.split('-')[1] || last;
    return `${min}-${max}`;
}

function resolveCohorts(cohorts: string[]): string[] {
    if (cohorts.includes(ALL_COHORTS)) {
        return [...dojoCohorts];
    }
    return cohorts;
}

export function prepareCourseForSave(course: Course, status: CourseStatus): Course {
    const cohorts = resolveCohorts(course.cohorts);
    return {
        ...course,
        status,
        cohorts,
        cohortRange: cohortRangeFromCohorts(cohorts),
        whatsIncluded: (course.whatsIncluded ?? []).map((item) => item.trim()).filter(Boolean),
        imageUrl: course.imageUrl?.trim() || undefined,
        videoUrl: course.videoUrl?.trim() || undefined,
        chapters: (course.chapters ?? []).map((chapter) => ({
            ...chapter,
            modules: chapter.modules.map((module) => ({
                ...module,
                videoUrls: module.videoUrls?.map((url) => url.trim()).filter(Boolean),
                pgns: module.pgns?.map((pgn) => pgn.trim()).filter(Boolean),
            })),
        })),
        purchaseOptions: (course.purchaseOptions ?? []).map((option) => ({
            ...option,
            sellingPoints: option.sellingPoints?.filter((sp) => sp.description.trim()),
        })),
    };
}

export function publishValidationError(course: Course): string | undefined {
    if (!course.name.trim()) {
        return 'Name is required to publish';
    }
    if (!course.description.trim()) {
        return 'Description is required to publish';
    }
    if (course.cohorts.length === 0) {
        return 'Select at least one cohort to publish';
    }
    if (
        (course.availableForFreeUsers || !course.includedWithSubscription) &&
        (course.purchaseOptions ?? []).length === 0
    ) {
        return 'Add a purchase option, or include the course with a subscription and hide it from free-tier users';
    }
    for (const option of course.purchaseOptions ?? []) {
        if (option.fullPrice < 100) {
            return 'Each purchase option must have a full price of at least $1';
        }
        if (option.currentPrice > 0 && option.currentPrice < 100) {
            return 'Sale price must be at least $1 if set';
        }
        if (option.currentPrice >= option.fullPrice) {
            return 'Sale price must be less than the full price if set';
        }
    }
    if ((course.chapters?.length ?? 0) === 0) {
        return 'Add at least one chapter to publish';
    }
    for (const chapter of course.chapters ?? []) {
        if ((chapter.modules?.length ?? 0) === 0) {
            return 'Add at least one module to each chapter to publish';
        }
        for (const mod of chapter.modules ?? []) {
            if (!mod.name.trim()) {
                return 'Add a name to each module to publish';
            }
        }
    }
    return undefined;
}
