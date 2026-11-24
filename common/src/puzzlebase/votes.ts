import { z } from 'zod';
import { PuzzlebasePuzzle } from './api';

/*
 * After playing a puzzle, a member can give it a thumbs up or a thumbs down, and change their mind
 * later. Like Lichess, a puzzle's popularity is the share of its votes that are up minus the share
 * that are down, from -100 (everyone dislikes it) to 100 (everyone likes it).
 */

/** Verifies a vote: 1 is a thumbs up, -1 a thumbs down, and 0 takes the member's vote back. */
export const VoteRequestSchema = z.object({
    puzzleId: z.string().min(1),
    vote: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});
export type VoteRequest = z.infer<typeof VoteRequestSchema>;

/** A member's vote on a puzzle: 1 up, -1 down, or 0 for none. */
export type Vote = VoteRequest['vote'];

/** The totals of a puzzle's votes. */
export interface VoteCounts {
    upvotes: number;
    downvotes: number;
}

/** What a vote did: the member's vote now, and the puzzle's new totals. */
export interface VoteResponse extends VoteCounts {
    vote: Vote;
}

/** How a vote changes the totals. Votes can be changed, so moving from up to down is both. */
export function voteDelta(before: Vote, after: Vote): VoteCounts {
    const up = (v: Vote) => (v === 1 ? 1 : 0);
    const down = (v: Vote) => (v === -1 ? 1 : 0);
    return { upvotes: up(after) - up(before), downvotes: down(after) - down(before) };
}

/**
 * The popularity of a puzzle, from -100 to 100, as on Lichess: 100 × (up − down) ÷ (up + down),
 * rounded. Undefined when it has no votes.
 */
export function popularity(counts: Partial<VoteCounts>): number | undefined {
    const up = counts.upvotes ?? 0;
    const down = counts.downvotes ?? 0;
    const total = up + down;
    return total === 0 ? undefined : Math.round((100 * (up - down)) / total);
}

/**
 * How sure we can be that a puzzle is liked: the low end of a 95% confidence interval on the share
 * of up votes (the Wilson score). One vote up ranks below fifty up and one down, which is what
 * "most popular" should mean. Used to rank, not to display.
 */
export function popularityRank(counts: Partial<VoteCounts>): number {
    const up = counts.upvotes ?? 0;
    const total = up + (counts.downvotes ?? 0);
    if (total === 0) return 0;
    const z = 1.96;
    const p = up / total;
    return (
        (p + (z * z) / (2 * total) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
        (1 + (z * z) / total)
    );
}

/** The most popular puzzles, best first: only puzzles more people liked than disliked. */
export function mostPopular(
    puzzles: Pick<PuzzlebasePuzzle, 'id' | 'upvotes' | 'downvotes'>[],
    limit = 10,
): typeof puzzles {
    return puzzles
        .filter((p) => (p.upvotes ?? 0) > (p.downvotes ?? 0))
        .sort(
            (a, b) =>
                popularityRank(b) - popularityRank(a) ||
                (b.upvotes ?? 0) - (a.upvotes ?? 0) ||
                a.id.localeCompare(b.id),
        )
        .slice(0, limit);
}
