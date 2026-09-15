export interface BulletPointData {
    key: string;
    excluded?: boolean;
}

export const trainingPlanBulletPoints: BulletPointData[] = [
    { key: 'dailyTasks' },
    { key: 'handpickedMaterial' },
    { key: 'progressTracking' },
    { key: 'trainingPartners' },
    { key: 'annotatedGames' },
    { key: 'openingSpy' },
];

export const communityBulletPoints: BulletPointData[] = [
    { key: 'studyGroups' },
    { key: 'classicalTournaments' },
    { key: 'graduationStreams' },
    { key: 'testsAndTactics' },
    { key: 'chessCommunity' },
    { key: 'privateDiscord' },
    { key: 'clubs' },
    { key: 'workshops' },
];

export const membershipBulletPoints: BulletPointData[] = [
    { key: 'dailyTasks' },
    { key: 'handpickedMaterial' },
    { key: 'advancedTracking' },
    { key: 'openingSpy' },
    { key: 'testsAndTactics' },
    { key: 'openingCourses' },
    { key: 'studyGroups' },
    { key: 'privateDiscord' },
    { key: 'workshops' },
];

export const freeBulletPoints: BulletPointData[] = [
    { key: 'limitedPlans' },
    { key: 'limitedDatabase' },
    { key: 'advancedTracking', excluded: true },
    { key: 'openingSpy', excluded: true },
    { key: 'testsAndTactics', excluded: true },
    { key: 'openingCourses', excluded: true },
    { key: 'studyGroups', excluded: true },
    { key: 'privateDiscord', excluded: true },
    { key: 'workshops', excluded: true },
];
