export interface BulletPointData {
    key: string;
    excluded?: boolean;
}

export const featureTiles: BulletPointData[] = [
    { key: 'dailyTasks' },
    { key: 'progressTracking' },
    { key: 'openingSpy' },
    { key: 'annotatedGames' },
];

export const communityBulletPoints: BulletPointData[] = [
    { key: 'classicalTournaments' },
    { key: 'workshops' },
    { key: 'testsAndTactics' },
    { key: 'studyGroups' },
    { key: 'graduationStreams' },
    { key: 'chessCommunity' },
    { key: 'privateDiscord' },
    { key: 'clubs' },
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
