/** Shared fixtures for the overview model and page tests: a member in 1500-1600 and the dojo's studies. */
import { Course, CourseModuleType, CourseStatus, CourseType } from '@/database/course';
import {
    CustomTask,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { dojoCohorts, SubscriptionStatus, User } from '@/database/user';
import { courseBook } from './book';

const STUDY_COHORTS = dojoCohorts.filter((c) => c !== '0-300');

function studyTask(cohort: string, count: number): Requirement {
    return {
        id: `study-${cohort}`,
        status: RequirementStatus.Active,
        category: RequirementCategory.Middlegames,
        name: 'Study Master Games',
        description: '',
        freeDescription: '',
        counts: { [cohort]: count },
        startCount: 0,
        numberOfCohorts: 1,
        unitScore: 1,
        unitScoreOverride: {},
        totalScore: 0,
        videoUrls: [],
        positions: [],
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: 'Games',
        updatedAt: '',
        sortPriority: '1',
        expirationDays: -1,
        isFree: false,
        blockers: [],
        atomic: false,
        expectedMinutes: 0,
        material: [
            { kind: 'COURSE', courseType: 'STUDY', courseId: `study-master-games-${cohort}` },
        ],
    };
}

export const requirements = STUDY_COHORTS.map((cohort, i) => studyTask(cohort, 10 + i));

/**
 * Shaped like Polgar M2 on dev: one count carried across cohorts, a start of 306, two course parts.
 */
export const polgarTask: Requirement = {
    ...studyTask('1000-1100', 650),
    id: 'polgar',
    category: RequirementCategory.Tactics,
    name: 'Solve Polgar M2s through Problem {{count}}',
    counts: { '600-700': 340, '1000-1100': 650, '1500-1600': 1550, '2400+': 3718 },
    startCount: 306,
    progressBarSuffix: 'Exercises',
    material: [
        { kind: 'COURSE', courseType: 'STUDY', courseId: 'polgar-1' },
        { kind: 'COURSE', courseType: 'STUDY', courseId: 'polgar-2' },
    ],
};

/** A part of the Polgar book, one module per problem, each named by its number. */
function polgarPart(id: string, from: number, to: number): Course {
    return {
        type: CourseType.Study,
        id,
        name: `Polgar M2 ${from}-${to}`,
        chapters: [
            {
                name: `Problems ${from}-${to}`,
                modules: Array.from({ length: to - from + 1 }, (_, i) => ({
                    id: `${id}-m${i}`,
                    name: `Problem ${from + i}`,
                    type: CourseModuleType.PgnViewer,
                    description: '',
                    postscript: '',
                    videoUrls: [],
                    pgns: [`[Event "Problem ${from + i}"]\n\n*`],
                    coach: '',
                    positions: [],
                    boardOrientation: 'white',
                })),
            },
        ],
    } as unknown as Course;
}
export const polgarPart1 = polgarPart('polgar-1', 307, 430);
export const polgarPart2 = polgarPart('polgar-2', 431, 650);
/** The first part as the overview would load it. */
export const polgarPartBook = courseBook(polgarPart1);

export const memberAt1000 = user({
    dojoCohort: '1000-1100',
    progress: {
        polgar: {
            requirementId: 'polgar',
            counts: { ALL_COHORTS: 420 },
            minutesSpent: {},
            updatedAt: '',
        },
    },
});

function customTask(id: string, name: string, count: number, material: CustomTask['material']) {
    return {
        id,
        owner: 'student',
        name,
        description: '',
        counts: { '1500-1600': count },
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        category: RequirementCategory.Endgame,
        numberOfCohorts: 1,
        progressBarSuffix: 'Games',
        updatedAt: '',
        material,
    } as CustomTask;
}

export const folderTask = customTask('folder-task', 'Rook endings from my games', 12, [
    { kind: 'DIRECTORY', owner: 'student', directoryId: 'rook' },
]);
export const najdorfTask = customTask('najdorf-task', 'Najdorf Sicilian', 31, [
    { kind: 'COURSE', courseType: 'OPENING', courseId: 'najdorf' },
]);

function course(overrides: Partial<Course>): Course {
    return {
        owner: 'coach',
        ownerDisplayName: 'Coach',
        stripeId: '',
        type: CourseType.Opening,
        id: 'course',
        name: 'Course',
        description: '',
        color: 'None',
        cohorts: ['1500-1600', '1600-1700'],
        cohortRange: 'Starter (1200-1800)',
        includedWithSubscription: true,
        availableForFreeUsers: false,
        status: CourseStatus.Published,
        ...overrides,
    };
}

export const courses = [
    course({ id: 'najdorf', name: 'Najdorf Sicilian' }),
    course({ id: 'french', name: 'French Defense' }),
    course({ id: 'caro', name: 'Caro Kann' }),
    course({
        id: 'e4',
        name: 'The Aggressive e4 Repertoire',
        cohorts: ['1800-1900', '1900-2000'],
        cohortRange: 'Expert (1800+)',
    }),
    course({ id: 'paid', name: 'Improve Your K+P Endings', includedWithSubscription: false }),
    course({
        id: 'study-master-games-1500-1600',
        name: 'Master Games 1500-1600',
        type: CourseType.Study,
        cohorts: ['1500-1600'],
        cohortRange: '1500-1600',
    }),
];

function entry(overrides: Partial<TimelineEntry>): TimelineEntry {
    return { createdAt: '2026-09-01T00:00:00Z', ...overrides } as TimelineEntry;
}

export function user(overrides: Partial<User>): User {
    return {
        username: 'student',
        dojoCohort: '1500-1600',
        subscriptionStatus: SubscriptionStatus.Subscribed,
        progress: {},
        customTasks: [],
        ...overrides,
    } as unknown as User;
}

const PGN = (n: number) =>
    `[Event "Game ${n}"]\n[White "W${n}"]\n[Black "B${n}"]\n[Result "*"]\n\n*`;
export const cohortCourse = {
    type: CourseType.Study,
    id: 'study-master-games-1500-1600',
    name: 'Master Games 1500-1600',
    chapters: [1, 2, 3, 4, 5, 6].map((n) => ({
        name: `Game ${n}`,
        modules: [
            {
                id: `m${n}`,
                name: '',
                type: CourseModuleType.PgnViewer,
                description: '',
                postscript: '',
                videoUrls: [],
                pgns: [PGN(n)],
                coach: '',
                positions: [],
                boardOrientation: 'white',
            },
        ],
    })),
} as unknown as Course;
export const cohortBook = courseBook(cohortCourse);

export const member = user({
    progress: {
        'study-1500-1600': {
            requirementId: 'study-1500-1600',
            counts: { ALL_COHORTS: 5 },
            minutesSpent: { '1500-1600': 220 },
            updatedAt: '',
        },
        'folder-task': {
            requirementId: 'folder-task',
            counts: { ALL_COHORTS: 3 },
            minutesSpent: {},
            updatedAt: '',
        },
    },
    customTasks: [najdorfTask, folderTask],
});

export const memberEntries = [
    entry({
        id: 'e1',
        requirementId: 'study-1500-1600',
        createdAt: '2026-09-10T00:00:00Z',
        studyInfo: { itemKey: cohortBook.chapters[4].items[0].key, itemName: 'Game 5' },
    }),
    entry({ id: 'e2', requirementId: 'folder-task', createdAt: '2026-09-12T00:00:00Z' }),
    entry({ id: 'e3', requirementId: 'unrelated', createdAt: '2026-09-13T00:00:00Z' }),
];
