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
        id: 'endgame-fundamentals-0-1200',
        type: SubscriptionTier.Lecture,
        name: 'Endgame Fundamentals',
        teacher: 'GM Jesse Kraai',
        cohortRange: '0-1200',
        tags: ['Endgames', '4 Recordings'],
        description:
            'Learn basic endgames, board vision, mating patterns, Zugzwang, and how to calculate in simple positions.',
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/endgame-fundamentals-2.webp',
        recordings: [
            {
                date: '2026-08-29',
                url: 'https://www.youtube.com/watch?v=OVgDx0nVguo',
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
];
