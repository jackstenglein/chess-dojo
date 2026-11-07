import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';

/**
 * Copy and offer data for the /class campaign page. The page is an English-only
 * sales experiment, so the copy lives here instead of messages/*.json until the
 * offer settles.
 */

export type ClassId = 'logical-chess' | 'calculation' | 'game-review';

export const STATS = [
    { target: 200000, label: 'Rating points gained' },
    { target: 4900, label: 'Graduations' },
    { target: 99800, label: 'Training hours logged' },
];

export const STUCK_WEEK = [
    { title: 'Twenty blitz games', note: 'None of them reviewed' },
    { title: 'A random YouTube lesson', note: 'Gone by your next game' },
    { title: 'Three-minute puzzle rush', note: 'Every miss forgotten by the next run' },
    { title: 'A new opening', note: 'The third one this year' },
];

const GAME_COLOR = '#F7A84B';
const TACTICS_COLOR = '#7FD66B';
const CLASS_COLOR = '#A796F5';
const HOMEWORK_COLOR = '#F48FB1';
const REVIEW_COLOR = '#4FC3F7';
const COHORT_COLOR = '#8DA5FF';

export interface WeekTask {
    title: string;
    /** Fits a small calendar cell. */
    short: string;
    category: string;
    color: string;
    description: string;
}

/** An example week. Team reviews are part of the Game & Profile Review plan. */
export const DOJO_WEEK: { day: string; tasks: WeekTask[] }[] = [
    {
        day: 'Mon',
        tasks: [
            {
                title: 'Attacking 101',
                short: 'Attacking 101',
                category: 'Live workshop',
                color: CLASS_COLOR,
                description: 'Join IM Tatev Abrahamyan live and ask questions as the class goes.',
            },
            {
                title: 'One Dojo Rush run, then retry every miss',
                short: 'Dojo Rush + retries',
                category: 'Tactics',
                color: TACTICS_COLOR,
                description:
                    'Ten minutes and three strikes. Then redo each puzzle you missed with no timer.',
            },
        ],
    },
    {
        day: 'Tue',
        tasks: [
            {
                title: 'Peer review with your team',
                short: 'Team peer review',
                category: 'Game & Profile Review',
                color: REVIEW_COLOR,
                description: 'Talk through your games with about 10 players at your rating.',
            },
            {
                title: 'Start your class homework',
                short: 'Class homework',
                category: 'Homework',
                color: HOMEWORK_COLOR,
                description:
                    'Work on Saturday’s positions now, so you arrive with your own answers.',
            },
        ],
    },
    {
        day: 'Wed',
        tasks: [
            {
                title: 'Checkmate Patterns',
                short: 'Checkmate Patterns',
                category: 'Live workshop',
                color: CLASS_COLOR,
                description: 'GM Josh Friedel teaches the patterns that finish promising attacks.',
            },
            {
                title: 'Compare answers in Discord',
                short: 'Discord with your cohort',
                category: 'Your cohort',
                color: COHORT_COLOR,
                description: 'Each workshop has its own channel. Your cohort is there too.',
            },
        ],
    },
    {
        day: 'Thu',
        tasks: [
            {
                title: 'Sensei review',
                short: 'Sensei review',
                category: 'Game & Profile Review',
                color: REVIEW_COLOR,
                description: 'A GM or IM goes deep on one team member’s game and training habits.',
            },
            {
                title: 'Fix one habit from the review',
                short: 'Fix one habit',
                category: 'Your training',
                color: TACTICS_COLOR,
                description: 'Take what the sensei said about the team’s games into your own plan.',
            },
        ],
    },
    {
        day: 'Fri',
        tasks: [
            {
                title: 'Tactics Bootcamp',
                short: 'Tactics Bootcamp',
                category: 'Live workshop',
                color: CLASS_COLOR,
                description: 'GM Jesse Kraai covers basic tactics and board visualization.',
            },
            {
                title: 'Join your study group',
                short: 'Study group',
                category: 'Your cohort',
                color: COHORT_COLOR,
                description: 'Community leaders run regular study groups for each cohort.',
            },
        ],
    },
    {
        day: 'Sat',
        tasks: [
            {
                title: 'Calculation 1000+',
                short: 'Calculation 1000+',
                category: 'Live workshop',
                color: CLASS_COLOR,
                description:
                    'Bring your homework to IM Kostya Kavutskiy and go through it together.',
            },
            {
                title: 'Play a long game',
                short: 'Long game',
                category: 'Games + Analysis',
                color: GAME_COLOR,
                description:
                    'A Dojo tournament or a club game gives you real pressure at the board.',
            },
        ],
    },
    {
        day: 'Sun',
        tasks: [
            {
                title: 'Analyze that game yourself',
                short: 'Analyze your game',
                category: 'Games + Analysis',
                color: GAME_COLOR,
                description: 'Annotate it yourself, then take it to your team.',
            },
            {
                title: 'Catch up on a recording',
                short: 'Watch a recording',
                category: 'Live workshop',
                color: CLASS_COLOR,
                description: 'Missed a class? Every one is recorded and waiting for you.',
            },
        ],
    },
];

export const METHOD_STEPS = [
    {
        title: 'Get the plan for your rating',
        description:
            'The program runs from 0 to 2400+. Every cohort’s plan has hand-picked material, and the most important task is playing long games and analyzing them.',
    },
    {
        title: 'Know what to do today',
        description:
            'Daily and weekly tasks tell you what to work on. You track hours, games and milestones, so progress shows up before your rating moves.',
    },
    {
        title: 'Train with your cohort',
        description:
            'On Discord you get someone above you to learn from, someone below you to teach and players at your level to spar with.',
    },
    {
        title: 'Graduate on stream',
        description:
            "Cross your cohort's rating threshold and a sensei analyzes one of your games on stream. Then you start the next plan.",
    },
];

export const RATING_MOVES = [
    {
        name: 'PepperChess',
        before: 543,
        after: 1301,
        site: 'Chess.com' as const,
        format: 'Rapid',
        quote: "I was stuck in the mid 700s on chess.com and showing little improvement. None of this would have been possible without the Dojo's program.",
    },
    {
        name: 'quad-exe',
        before: 1274,
        after: 1627,
        site: 'Chess.com' as const,
        format: 'Rapid',
        quote: 'I was struggling to get above 1300 when I found the Dojo, and now I am just laughing at 1400s and their timid superficial plans and little tricks.',
    },
    {
        name: 'Benwick',
        before: 1677,
        after: 2114,
        site: 'Lichess' as const,
        format: 'Classical',
        quote: 'This program is really helping me treat chess with respect. I approach each task with more reverence and more focus.',
    },
];

export const CLASS_COVERS = [
    {
        name: 'Calculation 1000+',
        teacher: 'IM Kostya Kavutskiy',
        detail: '42 recordings',
        imageUrl: 'https://i.ytimg.com/vi/5MynOIPEi4w/maxresdefault.jpg',
    },
    {
        name: 'Logical Chess Move by Move',
        teacher: 'GM Jesse Kraai',
        detail: '17 recordings',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/logical-chess-2.webp',
    },
    {
        name: 'Middlegame Decision Making',
        teacher: 'GM Josh Friedel',
        detail: '22 recordings',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/middlegame_decisions.webp',
    },
    {
        name: 'Intermediate Endgames',
        teacher: 'IM Tatev Abrahamyan',
        detail: '37 recordings',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/endgame-intermediate-2.webp',
    },
    {
        name: 'The Accelerated Dragon',
        teacher: 'GM Eugene Perelshteyn',
        detail: '12 recordings',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/Accelerated_Dragon.webp',
    },
    {
        name: "David's Guide to The Najdorf",
        teacher: 'IM David Pruess',
        detail: '4 recordings',
        imageUrl: 'https://i.ytimg.com/vi/MsJUbsshT9E/maxresdefault.jpg',
    },
];

export type SessionTeacher = 'jesse' | 'kostya' | 'david' | 'friedel' | 'tatev' | 'perelshteyn';

export interface CalendarSession {
    kind: 'workshop' | 'review';
    title: string;
    /** Shorter title for narrow calendar blocks. */
    shortTitle?: string;
    /** First session in the calendar week of Nov 2-8, 2026, in UTC. */
    utc: string;
    teacher?: SessionTeacher;
    teacherName?: string;
    audience?: string;
    coverUrl: string;
    description: string;
}

/** From the public class calendar (/public/calendar), read Oct 31, 2026. */
export const DOJO_CALENDAR: CalendarSession[] = [
    {
        kind: 'workshop',
        title: 'Attacking 101',
        utc: '2026-11-02T18:00:00Z',
        teacher: 'tatev',
        teacherName: 'IM Tatev Abrahamyan',
        audience: '1000-1500',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/attacking-101.webp',
        description:
            'The basic plans and themes of attacking chess, including typical kingside sacrifices, opposite-side castling and attacking the uncastled king.',
    },
    {
        kind: 'workshop',
        title: 'The London System',
        utc: '2026-11-04T16:00:00Z',
        teacher: 'perelshteyn',
        teacherName: 'GM Eugene Perelshteyn',
        audience: '1200+',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/2026-11_live-classes/london_system.jpg',
        description:
            'A reliable opening that cuts down your study time and keeps your winning chances.',
    },
    {
        kind: 'workshop',
        title: 'Checkmate Patterns',
        utc: '2026-11-04T17:00:00Z',
        teacher: 'friedel',
        teacherName: 'GM Josh Friedel',
        audience: '0-1200',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/2026-10_live-classes/checkmate_patterns.webp',
        description:
            'Turn promising attacks into wins by sharpening your tactical vision where it matters most: delivering checkmate.',
    },
    {
        kind: 'workshop',
        title: 'Tactics Bootcamp',
        utc: '2026-11-06T16:00:00Z',
        teacher: 'jesse',
        teacherName: 'GM Jesse Kraai',
        audience: '0-1200',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/2026-10_live-classes/tactics_bootcamp.webp',
        description:
            'Basic tactics and board visualization. Come prepared to sweat: get a problem right and you score a point, get it wrong and you lose one.',
    },
    {
        kind: 'workshop',
        title: 'Calculation 1000+',
        utc: '2026-11-07T17:00:00Z',
        teacher: 'kostya',
        teacherName: 'IM Kostya Kavutskiy',
        audience: '1000+',
        coverUrl: 'https://i.ytimg.com/vi/5MynOIPEi4w/maxresdefault.jpg',
        description:
            'Techniques and skills within calculation, with homework each week and study groups that solve the material together.',
    },
    {
        kind: 'workshop',
        title: 'Typical Pawn Structures',
        utc: '2026-11-07T18:05:00Z',
        teacher: 'kostya',
        teacherName: 'IM Kostya Kavutskiy',
        audience: '1200+',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/emails/july-live-classes/typical_pawn_structures.webp',
        description:
            'The most classic pawn structures in chess, including IQPs, hanging pawns and other thematic opening structures.',
    },
    {
        kind: 'review',
        title: 'Team Morphy sensei review',
        shortTitle: 'Morphy sensei',
        utc: '2026-11-02T17:00:00Z',
        audience: '0-800',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_morphy-1.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Capablanca peer review',
        shortTitle: 'Capablanca peer',
        utc: '2026-11-03T15:30:00Z',
        audience: '1600-2000',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_capablanca-1.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
    {
        kind: 'review',
        title: 'Team Alekhine sensei review',
        shortTitle: 'Alekhine sensei',
        utc: '2026-11-03T16:00:00Z',
        audience: '2000+',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_alekhine-1.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Lasker peer review',
        shortTitle: 'Lasker peer',
        utc: '2026-11-03T16:00:00Z',
        audience: '1300-1600',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_lasker-1.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
    {
        kind: 'review',
        title: 'Team Steinitz sensei review',
        shortTitle: 'Steinitz sensei',
        utc: '2026-11-03T17:05:00Z',
        audience: '800-1300',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_steinitz-1.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Anderssen peer review',
        shortTitle: 'Anderssen peer',
        utc: '2026-11-04T00:00:00Z',
        audience: '800-1300',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_anderssen.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
    {
        kind: 'review',
        title: 'Team Capablanca sensei review',
        shortTitle: 'Capablanca sensei',
        utc: '2026-11-05T16:00:00Z',
        audience: '1600-2000',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_capablanca-1.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Morphy peer review',
        shortTitle: 'Morphy peer',
        utc: '2026-11-05T17:00:00Z',
        audience: '0-800',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_morphy-1.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
    {
        kind: 'review',
        title: 'Team Lasker sensei review',
        shortTitle: 'Lasker sensei',
        utc: '2026-11-05T18:00:00Z',
        audience: '1300-1600',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_lasker-1.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Anderssen sensei review',
        shortTitle: 'Anderssen sensei',
        utc: '2026-11-06T00:00:00Z',
        audience: '800-1300',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_anderssen.webp',
        description:
            'The sensei looks at one member’s profile and games, picking up from that member’s peer review.',
    },
    {
        kind: 'review',
        title: 'Team Alekhine peer review',
        shortTitle: 'Alekhine peer',
        utc: '2026-11-06T16:00:00Z',
        audience: '2000+',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_alekhine-1.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
    {
        kind: 'review',
        title: 'Team Steinitz peer review',
        shortTitle: 'Steinitz peer',
        utc: '2026-11-06T17:15:00Z',
        audience: '800-1300',
        coverUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_steinitz-1.webp',
        description:
            'The team goes through its members’ games together, ahead of the sensei review.',
    },
];

export const CLASS_FACTS = [
    {
        title: 'Join from your browser',
        description: 'Classes run on Google Meet. Pick one from the calendar and click in.',
    },
    {
        title: 'Do the homework',
        description:
            'You get positions to work on before class, so you arrive with your own answers.',
    },
    {
        title: 'Can’t make it? Watch the recording',
        description: 'Every class is recorded, so a busy week doesn’t cost you the lesson.',
    },
    {
        title: 'Keep talking after class',
        description: 'Each workshop has its own private Discord channel.',
    },
];

export const REVIEW_TEAMS = [
    { name: 'Morphy', band: '0-800' },
    { name: 'Capablanca', band: '1600-2000' },
    { name: 'Alekhine', band: '2000+' },
    { name: 'Lasker', band: '1300-1600' },
    { name: 'Steinitz', band: '800-1300' },
    { name: 'Anderssen', band: '800-1300' },
];

export const OBJECTIONS = [
    {
        question: '“I can get this for free on YouTube.”',
        answer: 'You can find the ideas there. The Dojo adds the order to learn them in, players at your level to train with, and a sensei who answers your question in the room.',
    },
    {
        question: '“I work full-time. I can’t make live classes.”',
        answer: 'Every class is recorded, and the plan tells you what matters today. We ask for three hard training sessions a week, and a long game counts as one.',
    },
    {
        question: '“I’m not strong enough for this.”',
        answer: 'The plan starts at 0. Every workshop lists its rating range, and review teams are split by rating, so you work with players near your level.',
    },
];

export type DojoFeatureIcon =
    | 'plan'
    | 'tasks'
    | 'progress'
    | 'spy'
    | 'courses'
    | 'games'
    | 'tests'
    | 'tournaments'
    | 'discord'
    | 'cohort'
    | 'study'
    | 'clubs'
    | 'graduation';

export const DOJO_FEATURES: { icon: DojoFeatureIcon; title: string; description: string }[] = [
    {
        icon: 'plan',
        title: 'Training plan, 0 to 2400+',
        description: 'Every cohort has its own plan with hand-picked material.',
    },
    {
        icon: 'tasks',
        title: 'Daily and weekly tasks',
        description: 'The Dojo algorithm tells you what to work on today and this week.',
    },
    {
        icon: 'progress',
        title: 'Progress tracking',
        description: 'Track training hours, games and milestones along with your rating.',
    },
    {
        icon: 'spy',
        title: 'Opening Repertoire Spy',
        description: 'Prep your openings against the players you actually face.',
    },
    {
        icon: 'courses',
        title: 'All opening courses',
        description: 'Repertoires from the senseis, with sparring positions and exercises.',
    },
    {
        icon: 'games',
        title: 'Full game database',
        description: 'Annotated games from Dojo members, and room to add your own.',
    },
    {
        icon: 'tests',
        title: 'Dojo Rush, tests and puzzles',
        description: 'Ten-minute Rush runs where every miss comes back for a retry.',
    },
    {
        icon: 'tournaments',
        title: 'Classical tournaments',
        description: 'Round Robins, the Open Classical and DojoLiga give you long games to review.',
    },
    {
        icon: 'discord',
        title: 'Private Discord',
        description: 'An active server of Dojoers, with channels for your classes and cohort.',
    },
    {
        icon: 'cohort',
        title: 'Your cohort',
        description: 'Real opponents and mentors ready to analyze, spar and help your game.',
    },
    {
        icon: 'study',
        title: 'Study groups',
        description: 'Community leaders regularly run study groups for each cohort.',
    },
    {
        icon: 'clubs',
        title: 'Clubs',
        description: "Join or create a club and track your friends' progress.",
    },
    {
        icon: 'graduation',
        title: 'Graduation streams',
        description: 'Reach the next cohort and a sensei analyzes your game on stream.',
    },
];

export const FAQ = [
    {
        question: 'How much time do I need?',
        answer: 'Three hard training sessions a week. A long game counts as one, and going through that game afterward counts as another. Classes come on top of that, and every class is recorded, so a busy week doesn’t cost you the lesson.',
    },
    {
        question: 'I’m rated 600, or I don’t have a rating yet. Is this for me?',
        answer: 'Yes. The plan starts at 0, and every class lists its rating range. This week, Tactics Bootcamp with GM Jesse Kraai and Checkmate Patterns with GM Josh Friedel are both for players under 1200. Review teams are split by rating, so you’d look at games with players near your level.',
    },
    {
        question: 'I can learn chess free on YouTube. Why pay?',
        answer: 'Free videos are good for ideas, and we post them too. A video can’t see your games. In the Dojo you get a plan that says what to work on this week, homework you actually do, and a sensei who answers your question in the room.',
    },
    {
        question: 'Will I actually improve?',
        answer: 'That depends on the work you put in, so we won’t promise you a number. Dojo members have moved up a rating group more than 4,900 times, and a graduation only happens once a member’s rating passes the top of their cohort. We ask for three hard sessions a week.',
    },
    {
        question: 'What does it cost?',
        answer: 'Core is $12 a month billed yearly ($144) or $20 month to month. Workshops is $67 a month billed yearly ($804) or $75 month to month. Game & Profile Review is $180 a month billed yearly ($2,160) or $200 month to month. On yearly Workshops, one class a week works out to about $15 a class.',
    },
    {
        question: 'What if it isn’t for me?',
        answer: 'Cancel anytime from your profile, and you keep access until the end of the period you paid for.',
    },
    {
        question: 'Which plan should I pick?',
        answer: 'Core if you want the plan and the community. Workshops if you want to learn live every week. Game & Profile Review if you want a sensei looking at your own games and training habits; it includes every workshop. Not sure? Start with Workshops. You can move up later.',
    },
    {
        question: 'What happens in a live class?',
        answer: 'About an hour on Google Meet, in your browser. Most classes come with homework positions. The sensei teaches, goes through the homework and takes questions. Every class is recorded and has its own Discord channel.',
    },
];

export interface ValueItem {
    title: string;
    description: string;
    /** What the line is worth, in words. Undefined shows "Included". */
    value?: string;
}

export type ClassOfferTier =
    SubscriptionTier.Basic | SubscriptionTier.Lecture | SubscriptionTier.GameReview;

export interface Offer {
    tier: ClassOfferTier;
    name: string;
    /** Who the plan is for. */
    tagline: string;
    badge?: string;
    seats?: string;
    cta: string;
    accent: string;
    price: { month: number; year: number };
    items: ValueItem[];
    /** A plain comparison shown under the list. There is no summed "total value". */
    note?: string;
}

export const CORE_OFFER: Offer = {
    tier: SubscriptionTier.Basic,
    name: 'Core',
    tagline: 'For players who want the plan and the community, without live classes.',
    cta: 'Start the training plan',
    accent: '#8DA5FF',
    price: { month: 20, year: 12 },
    items: [
        {
            title: 'A training plan for your rating, 0 to 2500',
            description: 'Daily and weekly tasks that tell you what to work on.',
        },
        {
            title: 'All opening courses',
            description: 'Repertoires from the senseis, with sparring positions and exercises.',
            value: '$225 in the shop',
        },
        {
            title: 'The game database, Dojo Rush, tests and puzzles',
            description: 'Ten-minute Rush runs where every miss comes back for a retry.',
        },
        {
            title: 'Your cohort, tournaments and graduation streams',
            description:
                'Players at your level on Discord, study groups and classical games to review.',
        },
    ],
};

export const WORKSHOPS_OFFER: Offer = {
    tier: SubscriptionTier.Lecture,
    name: 'Workshops',
    tagline: 'For players who want to learn live with GMs and IMs every week.',
    badge: 'Best place to start live classes',
    seats: 'No seat limit. Join any workshop you want.',
    cta: 'Join this week’s live classes',
    accent: '#33b679',
    price: { month: 75, year: 67 },
    items: [
        {
            title: 'Six live classes a week with GMs and IMs',
            description:
                'This week: Attacking 101 (IM Tatev Abrahamyan), The London System (GM Eugene Perelshteyn), Checkmate Patterns (GM Josh Friedel), Tactics Bootcamp (GM Jesse Kraai), Calculation 1000+ and Typical Pawn Structures (IM Kostya Kavutskiy).',
            value: 'About $15 a class',
        },
        {
            title: 'Homework every week, gone through in class',
            description: 'Positions to work on before class, so you arrive with your own answers.',
        },
        {
            title: '200+ recorded classes, yours while you’re a member',
            description: 'Seven of these workshops sell separately in our shop for $520.',
            value: '$520 in the shop',
        },
        {
            title: 'A Discord channel for every class',
            description: 'Keep talking about the class after it ends.',
        },
        {
            title: 'ChessDojo Core',
            description:
                'Your plan, daily tasks, opening courses, Dojo Rush, your cohort and tournaments.',
            value: '$144 a year on its own',
        },
    ],
    note: 'About $15 a class if you come once a week on the yearly plan. Under $3 if you come to all six.',
};

export const GAME_REVIEW_OFFER: Offer = {
    tier: SubscriptionTier.GameReview,
    name: 'Game & Profile Review',
    tagline: 'For players who want a sensei looking at their own games and habits.',
    seats: 'Teams are capped at about 10 players, so your turn comes around.',
    cta: 'Join a review team',
    accent: '#039be5',
    price: { month: 200, year: 180 },
    items: [
        {
            title: 'A team of about 10 players at your rating',
            description: 'From 0-800 up to 2000+, with a private channel.',
        },
        {
            title: 'A weekly peer review of your teammates’ games',
            description: 'The team goes through its members’ games together.',
        },
        {
            title: 'A weekly sensei review with a GM or IM',
            description:
                'The featured spot rotates, so your own games come up in turn, and you learn from the others in between.',
            value: 'A private hour with a US GM: $150-200',
        },
        {
            title: 'Recordings of every review team, at every rating',
            description: 'Watch how the senseis handle players at other ratings.',
        },
        {
            title: 'Everything in Workshops',
            description: 'Every live workshop, the recorded library and ChessDojo Core.',
            value: '$804 a year on its own',
        },
    ],
    note: 'About the price of one private hour with a US GM, for a month of team reviews and every workshop.',
};

/** Desktop order. Phones put Workshops first. */
export const OFFERS = [CORE_OFFER, WORKSHOPS_OFFER, GAME_REVIEW_OFFER];

export function offerForTier(tier: ClassOfferTier): Offer {
    return OFFERS.find((offer) => offer.tier === tier) ?? WORKSHOPS_OFFER;
}

/** The biggest yearly saving across the plans, for the billing toggle. */
export const MAX_YEARLY_SAVING = Math.max(
    ...OFFERS.map((offer) => (offer.price.month - offer.price.year) * 12),
);

export const VALUE_FOOTNOTE =
    'Shop prices checked Nov 7, 2026. Three workshop courses are 20% off right now and the values use the sale price. Recordings and courses stay available while your plan is active. Prices in USD. Tax may be added at checkout. Plans renew until you cancel.';
