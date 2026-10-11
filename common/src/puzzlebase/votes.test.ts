import { describe, expect, it } from 'vitest';
import { mostPopular, popularity, popularityRank, voteDelta, VoteRequestSchema } from './votes';

describe('popularity', () => {
    it('is the share of up votes minus the share of down votes, from -100 to 100', () => {
        expect(popularity({ upvotes: 9, downvotes: 1 })).toBe(80);
        expect(popularity({ upvotes: 1, downvotes: 1 })).toBe(0);
        expect(popularity({ upvotes: 0, downvotes: 4 })).toBe(-100);
        expect(popularity({ upvotes: 4, downvotes: 0 })).toBe(100);
        expect(popularity({ upvotes: 2, downvotes: 1 })).toBe(33);
    });

    it('is not defined without votes', () => {
        expect(popularity({})).toBeUndefined();
        expect(popularity({ upvotes: 0, downvotes: 0 })).toBeUndefined();
    });
});

describe('voteDelta', () => {
    it('adds a first vote', () => {
        expect(voteDelta(0, 1)).toEqual({ upvotes: 1, downvotes: 0 });
        expect(voteDelta(0, -1)).toEqual({ upvotes: 0, downvotes: 1 });
    });

    it('moves a vote when the member changes their mind', () => {
        expect(voteDelta(1, -1)).toEqual({ upvotes: -1, downvotes: 1 });
        expect(voteDelta(-1, 1)).toEqual({ upvotes: 1, downvotes: -1 });
    });

    it('takes a vote back, and changes nothing when it is the same', () => {
        expect(voteDelta(1, 0)).toEqual({ upvotes: -1, downvotes: 0 });
        expect(voteDelta(-1, 0)).toEqual({ upvotes: 0, downvotes: -1 });
        expect(voteDelta(1, 1)).toEqual({ upvotes: 0, downvotes: 0 });
    });
});

describe('mostPopular', () => {
    const p = (id: string, upvotes?: number, downvotes?: number) => ({ id, upvotes, downvotes });

    it('ranks many likes above a lone like', () => {
        expect(popularityRank({ upvotes: 1 })).toBeLessThan(
            popularityRank({ upvotes: 50, downvotes: 1 }),
        );
        const ranked = mostPopular([p('001', 1, 0), p('002', 50, 1), p('003', 10, 0)]);
        expect(ranked.map((x) => x.id)).toEqual(['002', '003', '001']);
    });

    it('leaves out puzzles nobody liked or that were disliked more', () => {
        const ranked = mostPopular([p('001'), p('002', 0, 3), p('003', 2, 2), p('004', 3, 1)]);
        expect(ranked.map((x) => x.id)).toEqual(['004']);
    });

    it('stops at the limit', () => {
        const many = Array.from({ length: 12 }, (_, i) => p(String(i).padStart(3, '0'), 5, 0));
        expect(mostPopular(many, 10)).toHaveLength(10);
    });
});

describe('VoteRequestSchema', () => {
    it('accepts up, down and none, and nothing else', () => {
        for (const vote of [1, -1, 0]) {
            expect(VoteRequestSchema.safeParse({ puzzleId: '001', vote }).success).toBe(true);
        }
        expect(VoteRequestSchema.safeParse({ puzzleId: '001', vote: 2 }).success).toBe(false);
        expect(VoteRequestSchema.safeParse({ puzzleId: '', vote: 1 }).success).toBe(false);
    });
});
