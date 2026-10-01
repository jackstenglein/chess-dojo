export interface TestimonialData {
    key: string;
    username: string;
    ratingBefore: string;
    ratingAfter: string;
}

export const testimonials: TestimonialData[] = [
    {
        key: 'pepperchess',
        username: 'google_118116500685175369509',
        ratingBefore: '543',
        ratingAfter: '1301 Chess.com Rapid',
    },
    {
        key: 'benwick',
        username: 'google_108884714031056859857',
        ratingBefore: '1677',
        ratingAfter: '2114 Lichess Classical',
    },
    {
        key: 'quadexe',
        username: 'google_104406360194364423918',
        ratingBefore: '1274',
        ratingAfter: '1627 Chess.com Rapid',
    },
];
