import { TimelineEntry } from '@/database/timeline';
import { cohortColors, compareCohorts, dojoCohorts, User } from '@/database/user';
import { TacticsRating } from '@/exams/view/exam';
import { cohortIcons } from '@/scoreboard/CohortIcon';
import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';

export interface Badge {
    image: string;
    title: string;
    message: string;
    isEarned: boolean;
    category: BadgeCategory;
    isPreviousLevel?: boolean;
    currentCount?: number;
    level?: number;
    glowHexcode?: string;
}

/** Task IDs that map to badges. */
enum BadgeTask {
    PolgarMateOne = '917be358-e6d9-47e6-9cad-66fc2fdb5da6',
    PolgarMateTwo = 'f815084f-b9bc-408d-9db9-ba9b1c260ff3',
    PolgarMateThree = '657fd4c7-461c-4503-b5f7-38a5a3480008',
    ClassicalGames = '38f46441-7a4e-4506-8632-166bcbe78baf',
    AnnotateGames = '4d23d689-1284-46e6-b2a2-4b4bfdc37174',
}

const yearlyBadgeTasks: string[] = [BadgeTask.ClassicalGames, BadgeTask.AnnotateGames] as const;

/** The categories a badge can be in. */
export enum BadgeCategory {
    All = 'All Badges',
    Achieved = 'Achieved Badges',
    Polgar = 'Polgar Mates',
    Games = 'Games',
    Annotation = 'Annotations',
    Graduation = 'Graduations',
}

/** Badge limits mapped by task. */
const BADGE_LIMITS: Record<BadgeTask, number[]> = {
    [BadgeTask.PolgarMateOne]: [50, 306],
    [BadgeTask.PolgarMateTwo]: [500, 750, 1471, 2000, 2500, 3000, 3718],
    [BadgeTask.PolgarMateThree]: [4462],
    [BadgeTask.ClassicalGames]: [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
    [BadgeTask.AnnotateGames]: [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
};

const classicalGameMilestones: Record<number, string> = {
    1: 'Congrats on playing your first classical game. Keep up the good work!',
    5: "Congrats on playing five classical games. That's a full tournament!",
    10: "Congrats on playing 10 classical games! You're on your way!",
    25: "Wow! 25 classical games—you're really dedicated!",
    50: "Congrats on reaching 50 classical games! That's impressive!",
    75: "You're unstoppable! 75 classical games played!",
    100: "Amazing! You've played 100 classical games—century club!",
    150: '150 classical games! Your dedication is truly inspiring!',
    200: "200 classical games—you're a seasoned player now!",
    250: 'Incredible! 250 classical games! A true chess warrior!',
    300: '300 classical games! Your endurance is unmatched!',
    400: '400 classical games—masterful commitment!',
    500: "500 classical games! You're a true legend!",
};

const annotationMilestones: Record<number, string> = {
    1: 'Congrats on annotating your first classical game. Keep up the good work!',
    5: "Congrats on annotating five classical games. That's a strong start!",
    10: "Congrats on annotating 10 classical games! You're building valuable insights!",
    25: 'Wow! 25 classical game annotations—your analysis is impressive!',
    50: 'Congrats on reaching 50 annotated classical games! A true analyst!',
    75: "You're a dedicated student of the game! Whoa, check out Fischer over here!",
    100: 'Amazing! 100 classical game annotations—insightful mastery! Whoa, check out Botvinnik over here!',
    150: '150 annotations! Your analytical skills are truly inspiring!',
    200: "200 classical game annotations—you're shaping your chess mind!",
    250: 'Incredible! 250 annotations! A true chess scholar!',
    300: '300 annotations! Whoa, check out Tarrasch over here!!',
    400: '400 classical game annotations—remarkable dedication!',
    500: '500 classical game annotations! Whoa, check out Tartakower over here!',
};

const polgarMateMilestones: Record<number, string> = {
    50: "Congrats on solving your first 50 Polgar mates! You're sharpening your tactical vision.",
    306: "Amazing! You've completed all mate-in-ones. Great job recognizing immediate threats!",
    500: '500 Polgar mates solved! Your tactical acumen is growing rapidly.',
    750: "750 Polgar mates! That's impressive dedication to tactical mastery.",
    1471: "Incredible! You've solved all simple mate-in-twos. Tactical brilliance!",
    2000: '2,000 Polgar mates solved—truly remarkable tactical prowess!',
    2500: "2,500 Polgar mates! You're a tactical mastermind!",
    3000: "3,000 Polgar mates solved—you're relentless in your pursuit of tactical excellence!",
    3718: "Outstanding! You've conquered all mate-in-twos. Tactical genius unlocked!",
    4462: "Amazing achievement! You've mastered all mate-in-threes. Tactical artistry!",
};

const BADGE_MAX_GLOW_COLOR: Record<BadgeTask, string> = {
    [BadgeTask.PolgarMateOne]: '#AB2ECE',
    [BadgeTask.PolgarMateTwo]: '#33C0C6',
    [BadgeTask.PolgarMateThree]: '#C67B09',
    [BadgeTask.AnnotateGames]: '#72B526',
    [BadgeTask.ClassicalGames]: '#39A99A',
};

const BADGE_TITLE: Record<BadgeTask, string> = {
    [BadgeTask.PolgarMateOne]: 'Polgar M1',
    [BadgeTask.PolgarMateTwo]: 'Polgar M2',
    [BadgeTask.PolgarMateThree]: 'Polgar M3',
    [BadgeTask.AnnotateGames]: 'Classical Games Annotated',
    [BadgeTask.ClassicalGames]: 'Classical Games Played',
};

/**
 * Gets the image URL for the given badge task and level.
 * @param level The level to fetch the badge for.
 * @param task The task of the badge.
 * @returns The image URL for the badge.
 */
function getBadgeImage(level: number, task: BadgeTask): string | undefined {
    switch (task) {
        case BadgeTask.PolgarMateOne:
        case BadgeTask.PolgarMateTwo:
        case BadgeTask.PolgarMateThree:
            return `/static/badges/polgar/v1/${level}.png`;
        case BadgeTask.ClassicalGames:
            return `/static/badges/classical_games_played/v1/${level}.png`;
        case BadgeTask.AnnotateGames:
            return `/static/badges/classical_games_annotated/v1/${level}.png`;
    }
}

/**
 * Returns the badge level for the given user and requirement.
 * @param user The user to get the level for.
 * @param timeline The timeline of the user to get the level for.
 * @param requirementId The requirement to get the level for.
 * @param levels The badge requirement levels.
 * @returns The max level and the total count the user has achieved in the badge.
 */
function getBadgeLevel(
    user: User,
    timeline: TimelineEntry[],
    requirementId: string,
    levels: number[],
): { maxLevel: number; currentCount: number } {
    let currentCount = 0;

    if (yearlyBadgeTasks.includes(requirementId)) {
        currentCount = timeline
            .filter((t) => t.requirementId === requirementId)
            .reduce((sum, t) => sum + t.newCount - t.previousCount, 0);
    } else {
        const progress = user.progress[requirementId];
        if (!progress) {
            return { maxLevel: -1, currentCount: 0 };
        }
        currentCount = Object.values(progress.counts || {}).reduce((sum, v) => sum + v, 0);
    }

    let maxLevel = -1;
    for (const level of levels) {
        if (currentCount >= level) {
            maxLevel = level;
        } else {
            return { maxLevel, currentCount };
        }
    }
    return { maxLevel, currentCount };
}

/**
 * Returns the message for the given level and badge task.
 * @param level The level of the badge.
 * @param task The task of the badge.
 * @returns The message for the badge.
 */
function getBadgeMessage(level: number, task: BadgeTask): string {
    switch (task) {
        case BadgeTask.PolgarMateOne:
        case BadgeTask.PolgarMateTwo:
        case BadgeTask.PolgarMateThree:
            return polgarMateMilestones[level];
        case BadgeTask.AnnotateGames:
            return annotationMilestones[level];
        case BadgeTask.ClassicalGames:
            return classicalGameMilestones[level];
    }
}

/**
 * Returns the badge category associated with the given task.
 * @param task The task of the badge.
 * @returns The badge category associated with the given task.
 */
function getBadgeCategory(task: BadgeTask): BadgeCategory {
    switch (task) {
        case BadgeTask.PolgarMateOne:
        case BadgeTask.PolgarMateTwo:
        case BadgeTask.PolgarMateThree:
            return BadgeCategory.Polgar;
        case BadgeTask.ClassicalGames:
            return BadgeCategory.Games;
        case BadgeTask.AnnotateGames:
            return BadgeCategory.Annotation;
    }
}

/**
 * Returns the title for the given level and badge task.
 * @param level The level of the badge.
 * @param task The task of the badge.
 * @returns The title of the badge.
 */
function getBadgeTitle(level: number, task: BadgeTask): string {
    return `${BADGE_TITLE[task]} - ${level}`;
}

/**
 * Checks if the given level is the maximum level for the badge task.
 * @param level The level to check.
 * @param task The task of the badge to check.
 * @returns True if level is equal to the badge type's max level.
 */
function isMaxBadge(level: number, task: BadgeTask): boolean {
    return level === BADGE_LIMITS[task][BADGE_LIMITS[task].length - 1];
}

/**
 * Returns the glow color for the given level and badge task.
 * @param level The level of the badge.
 * @param task The task of the badge.
 * @returns The glow color for the badge.
 */
function getBadgeGlow(level: number, task: BadgeTask): string | undefined {
    return isMaxBadge(level, task) ? BADGE_MAX_GLOW_COLOR[task] : undefined;
}

/**
 * Returns the graduation badge for the given cohort.
 * @param cohort The cohort graduated from.
 * @param isEarned Whether the user has earned the badge.
 * @returns The graduation badge for the given cohort.
 */
function getGraduationBadge(cohort: string, isEarned: boolean): Badge {
    return {
        image: cohortIcons[cohort],
        title: `Graduated from ${cohort}`,
        message: `Congratulations! You have graduated from ${cohort}`,
        isEarned,
        category: BadgeCategory.Graduation,
        glowHexcode: cohortColors[cohort],
    };
}

/**
 * @param isEarned Whether the user has earned the badge.
 * @returns A badge for being a Dojo 1.0 member.
 */
function getDojoerBadge(isEarned: boolean): Badge {
    return {
        image: '/static/badges/misc/DojoHeart.png',
        title: 'Dojo member since 1.0',
        message: 'You have been a valuable Dojo member from the start! Thanks for your support!',
        isEarned,
        glowHexcode: '#BD01F2',
        category: BadgeCategory.All,
    };
}

/**
 * @param isEarned Whether the user has earned the badge.
 * @returns A badge for being a beta tester.
 */
function getBetaTesterBadge(isEarned: boolean): Badge {
    return {
        image: '/static/badges/misc/betatest.png',
        title: 'Participated in a Beta Test',
        message: 'Thanks for testing new features!',
        isEarned,
        glowHexcode: '#6305BC',
        category: BadgeCategory.All,
    };
}

/**
 * @param isEarned Whether the user has earned the badge.
 * @returns A badge for being a tactics champion.
 */
export type BadgeDetectionResult =
    | { action: 'none' }
    | { action: 'initialize'; badges: Badge[] }
    | { action: 'new_badge'; newBadge: Badge; allEarned: Badge[] };

/**
 * Determines whether to initialize the badge baseline, display a newly earned
 * badge, or do nothing. Requires `dataFullyLoaded` to be true before the
 * baseline is set, which prevents false-positive popups caused by partial data
 * during loading.
 */
export function detectNewBadge(
    previousEarnedBadges: Badge[] | undefined,
    earnedBadges: Badge[],
    dataFullyLoaded: boolean,
): BadgeDetectionResult {
    if (!previousEarnedBadges) {
        if (dataFullyLoaded) {
            return { action: 'initialize', badges: earnedBadges };
        }
        return { action: 'none' };
    }

    const newBadge = earnedBadges.find((b) =>
        previousEarnedBadges.every((b2) => b.image !== b2.image),
    );
    if (newBadge) {
        return { action: 'new_badge', newBadge, allEarned: earnedBadges };
    }
    return { action: 'none' };
}

export function getTacticsChampionBadge(isEarned: boolean) {
    return {
        image: `/static/badges/misc/tacticschampion.png`,
        title: 'Tactics Champion',
        message: `Your tactics rating is at the level of the next cohort!`,
        isEarned,
        glowHexcode: '#D4AA02',
        category: BadgeCategory.All,
    };
}

/**
 * Returns the badge for the given level and task.
 * @param level The level of the badge.
 * @param task The task of the badge.
 * @param isEarned Whether the badge is earned.
 * @param isPreviousLevel Whether the badge is for a previous level and superseded by another earned badge.
 * @param currentCount The current value the user has for the badge.
 * @returns The badge for the given information.
 */
function getTaskBadge({
    level,
    task,
    isEarned,
    isPreviousLevel,
    currentCount,
}: {
    level: number;
    task: BadgeTask;
    isEarned: boolean;
    isPreviousLevel: boolean;
    currentCount: number;
}): Badge {
    return {
        image: getBadgeImage(level, task) || '',
        title: getBadgeTitle(level, task),
        message: getBadgeMessage(level, task) || '',
        category: getBadgeCategory(task),
        isEarned,
        isPreviousLevel,
        currentCount,
        level,
        glowHexcode: getBadgeGlow(level, task),
    };
}

/**
 * Returns a list of all possible badges.
 * @param user The user to get badges for.
 * @param tacticsRating The current tactics rating of the user.
 * @param timeline The timeline of the user to get badges for.
 * @returns A list of all possible badges, both earned and not earned.
 */
export function getBadges(
    user: User,
    tacticsRating: TacticsRating,
    timeline: TimelineEntry[],
): Badge[] {
    const allBadges = [getDojoerBadge(!user.createdAt), getBetaTesterBadge(user.isBetaTester)];

    const [, minTacticsRating] = getCohortRangeInt(user.dojoCohort);
    const isProvisional = tacticsRating.components.some((c) => c.rating < 0);
    allBadges.push(
        getTacticsChampionBadge(!isProvisional && tacticsRating.overall >= minTacticsRating),
    );

    for (const task of Object.values(BadgeTask)) {
        const { maxLevel: eligibleLevel, currentCount } = getBadgeLevel(
            user,
            timeline,
            task,
            BADGE_LIMITS[task],
        );
        const levels = BADGE_LIMITS[task];
        for (const level of levels) {
            allBadges.push(
                getTaskBadge({
                    level,
                    task,
                    isEarned: level <= eligibleLevel,
                    isPreviousLevel: level < eligibleLevel,
                    currentCount,
                }),
            );
        }
    }

    const graduationCohorts = user.graduationCohorts?.sort(compareCohorts) ?? [];

    for (let i = 0; i < dojoCohorts.length - 1; i++) {
        if (
            (graduationCohorts.length === 0 && i >= dojoCohorts.indexOf(user.dojoCohort)) ||
            i >= dojoCohorts.indexOf(graduationCohorts[0])
        ) {
            allBadges.push(
                getGraduationBadge(dojoCohorts[i], graduationCohorts.includes(dojoCohorts[i])),
            );
        }
    }

    return allBadges;
}
