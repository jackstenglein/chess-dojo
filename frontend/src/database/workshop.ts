export type WorkshopCategory = 'Opening' | 'Middlegame' | 'Endgame';

export interface WorkshopRecording {
    id: string;
    title: string;
    videoUrl?: string;
    pgn?: string;
}

export interface Workshop {
    id: string;
    name: string;
    teacher: string;
    category: WorkshopCategory;
    cohortRange: string;
    description: string;
    price: number;
    recordings: WorkshopRecording[];
}

export const mockWorkshops: Workshop[] = [
    {
        id: 'ws-1',
        name: 'The Aggressive e4 Repertoire',
        teacher: 'Jesse Kraai',
        category: 'Opening',
        cohortRange: '1800+',
        price: 30,
        description:
            'GM Jesse Kraai provides an aggressive repertoire for white starting with 1. e4. Covers responses to e5, the French Defense, Caro Kann, and Sicilian.',
        recordings: [
            {
                id: 'rec-1',
                title: 'Crushing the French Defense',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
                pgn: '1. e4 e6',
            },
            {
                id: 'rec-2',
                title: 'Handling the Caro Kann',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
                pgn: '1. e4 c6',
            },
        ],
    },
    {
        id: 'ws-2',
        name: 'French Defense: Black Repertoire',
        teacher: 'Jesse Kraai',
        category: 'Opening',
        cohortRange: '1200-1800',
        price: 30,
        description:
            "A complete starter repertoire for the French Defense from black's perspective. Includes sparring positions and model games.",
        recordings: [
            {
                id: 'rec-3',
                title: 'Advance Variation Masterclass',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
                pgn: '1. e4 e6 2. d4 d5 3. e5',
            },
            {
                id: 'rec-4',
                title: 'Exchange Variation Strategies',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-3',
        name: "King's Indian Defense",
        teacher: 'Kostya Kavutskiy',
        category: 'Opening',
        cohortRange: '1200-1800',
        price: 30,
        description:
            "IM Kostya Kavutskiy covers the King's Indian Defense from black's perspective, covering the main variations and major sidelines.",
        recordings: [
            {
                id: 'rec-5',
                title: 'Mar del Plata Variation',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
                pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7',
            },
            {
                id: 'rec-6',
                title: 'Samisch Variation Setup',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-4',
        name: 'Mastering the Middlegame',
        teacher: 'Kostya Kavutskiy',
        category: 'Middlegame',
        cohortRange: '1200-1800',
        price: 30,
        description:
            'Learn how to formulate plans, exploit pawn structures, and maneuver your pieces for maximum attacking potential in complex middlegames.',
        recordings: [
            {
                id: 'rec-7',
                title: 'Pawn Structure Strategies',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-8',
                title: 'Creating and Using Outposts',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-5',
        name: 'Attacking Chess Fundamentals',
        teacher: 'David Pruess',
        category: 'Middlegame',
        cohortRange: '1000-2200',
        price: 30,
        description:
            'IM David Pruess breaks down the core tenets of building a devastating attack against the enemy king, including piece coordination and timing.',
        recordings: [
            {
                id: 'rec-9',
                title: 'The Greek Gift Sacrifice',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-10',
                title: 'Attacking the Uncastled King',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-6',
        name: 'Positional Chess Mastery',
        teacher: 'Jesse Kraai',
        category: 'Middlegame',
        cohortRange: '1500-2400',
        price: 30,
        description:
            'A deep dive into positional evaluation, improving your worst piece, and slowly outmaneuvering your opponent without relying on cheap tactics.',
        recordings: [
            {
                id: 'rec-11',
                title: 'Evaluating Imbalances',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-12',
                title: 'The Art of Prophylaxis',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-7',
        name: 'Improve Your K+P Endings',
        teacher: 'David Pruess',
        category: 'Endgame',
        cohortRange: '1000-2200',
        price: 30,
        description:
            'In this workshop, IM David Pruess explains important strategic K+P elements like King movement, shouldering, queening races, and the opposition.',
        recordings: [
            {
                id: 'rec-13',
                title: 'King Movement & Shouldering',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
                pgn: '1. e4 e5',
            },
            {
                id: 'rec-14',
                title: 'Queening Races & Opposition',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-15',
                title: 'Solving Technique',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-8',
        name: 'Essential Rook Endgames',
        teacher: 'Kostya Kavutskiy',
        category: 'Endgame',
        cohortRange: '1200-2000',
        price: 30,
        description:
            'Rook endgames are the most common in chess. Master the Philidor position, Lucena position, and Vancura defense to save lost games.',
        recordings: [
            {
                id: 'rec-16',
                title: 'Lucena and Philidor Masterclass',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-17',
                title: 'Active vs Passive Rooks',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
    {
        id: 'ws-9',
        name: 'Minor Piece Endgames',
        teacher: 'Jesse Kraai',
        category: 'Endgame',
        cohortRange: '1500-2200',
        price: 30,
        description:
            'Learn the nuances of Bishop vs Knight endgames, opposite-colored bishops, and how to convert tiny advantages in minor piece endings.',
        recordings: [
            {
                id: 'rec-18',
                title: 'Good Knight vs Bad Bishop',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
            {
                id: 'rec-19',
                title: 'Opposite Colored Bishops Strategy',
                videoUrl: 'https://player.vimeo.com/video/76979871?h=8272103f6e',
            },
        ],
    },
];
