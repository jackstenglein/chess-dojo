import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';

const CALCULATION_COVER = 'https://i.ytimg.com/vi/5MynOIPEi4w/maxresdefault.jpg';

/**
 * Representative live classes shown on the landing page.
 * Kept static so the marketing page does not depend on the recordings API.
 */
export const landingLiveClasses: LiveClass[] = [
    {
        id: 'logical-chess',
        type: SubscriptionTier.Lecture,
        name: 'Logical Chess Move by Move',
        teacher: 'GM Jesse Kraai',
        cohortRange: '0-1200',
        tags: ['Middlegame', '17 Recordings'],
        description:
            'Learn to play the Najdorf intuitively, focusing on the main ideas, without needing to memorize lines.',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/logical-chess-2.webp',
        recordings: [
            { date: '', url: 'https://www.youtube.com/embed/JCKN4drZ160?autoplay=1', s3Key: '' },
        ],
    },
    {
        id: 'calculation-1000',
        type: SubscriptionTier.Lecture,
        name: 'Calculation 1000+',
        teacher: 'IM Kostya Kavutskiy',
        cohortRange: '1000+',
        tags: ['Calculation', '30+ Recordings'],
        description:
            "IM Kostya Kavutskiy's weekly class focusing on various techniques and skills within calculation.",
        imageUrl: CALCULATION_COVER,
        recordings: [
            {
                date: '2026-08-29',
                url: 'https://www.youtube.com/embed/QPqV-nAuLXo?autoplay=1',
                s3Key: '',
            },
        ],
    },
    {
        id: 'the-najdorf',
        type: SubscriptionTier.Lecture,
        name: "David's Guide to The Najdorf",
        teacher: 'IM David Pruess',
        cohortRange: '1100+',
        tags: ['Openings', '4 Recordings'],
        description:
            'Learn to play the Najdorf intuitively, focusing on the main ideas, without needing to memorize lines.',
        imageUrl: 'https://i.ytimg.com/vi/MsJUbsshT9E/maxresdefault.jpg',
        recordings: [],
    },
    {
        id: 'middlegame-decision-making',
        type: SubscriptionTier.Lecture,
        name: 'Middlegame Decision Making',
        teacher: 'GM Josh Friedel',
        cohortRange: '1100+',
        tags: ['Middlegame', '22 Recordings'],
        description:
            'Learn to play the Najdorf intuitively, focusing on the main ideas, without needing to memorize lines.',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/middlegame_decisions.webp',
        recordings: [
            { date: '', url: 'https://www.youtube.com/embed/01al6AcUz_8?autoplay=1', s3Key: '' },
        ],
    },
    {
        id: 'intermediate-endgames',
        type: SubscriptionTier.Lecture,
        name: 'Intermediate Endgames',
        teacher: 'IM Tatev Abrahamyan',
        cohortRange: '1100+',
        tags: ['Endgames', '4 Recordings'],
        description:
            'IM Tatev Abrahamyan covers more advanced K+P endgames, as well as important minor piece and rook endgames like the Lucena and Philidor.',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/endgame-intermediate-2.webp',
        recordings: [
            {
                date: '2026-09-21',
                url: 'https://www.youtube.com/watch?v=Y9BeyFbM6mA',
                s3Key: '',
            },
        ],
    },
    {
        id: 'accelerated-dragon',
        type: SubscriptionTier.Lecture,
        name: 'The Accelerated Dragon',
        teacher: 'GM Eugene Perelshteyn',
        cohortRange: '1200+',
        tags: ['Opening', '4 Recordings'],
        description:
            "Perfect for players who love dynamic, counter-attacking chess, this masterclass will teach you how to achieve a powerful Sicilian setup while bypassing White's most dangerous attacking lines. GM Perelshteyn will break down the crucial pawn structures, tactical themes, and hidden traps that will leave your opponents scrambling.",
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/Accelerated_Dragon.webp',
        recordings: [
            {
                date: '2026-08-05',
                url: 'https://www.youtube.com/watch?v=8GLJJp4NzDc',
                s3Key: '',
            },
        ],
    },
];
