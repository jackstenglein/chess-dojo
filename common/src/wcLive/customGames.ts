import { z } from 'zod';

/**
 * Extra games senseis add to the live page by pasting a Lichess link, so the
 * page can follow any game: for testing, or for guess the move on other games.
 */

export type WcCustomGameKind = 'game' | 'broadcastGame' | 'broadcastRound';

export interface WcLichessLink {
    kind: WcCustomGameKind;
    /** The id the page and the API use for the tab: always 8 letters and digits. */
    id: string;
    /** A Lichess game, or a broadcast board (a study chapter). */
    gameId?: string;
    /** A broadcast round. */
    roundId?: string;
}

export interface WcCustomGame extends WcLichessLink {
    name: string;
    url: string;
    addedBy: string;
    addedAt: string;
}

/** At most this many added games, so the tabs stay usable. */
export const MAX_CUSTOM_GAMES = 20;

const LICHESS_ID = /^[A-Za-z0-9]{8}$/;

/**
 * Reads a Lichess link:
 * - lichess.org/abcd1234 (or /abcd1234/white, or a 12-character player link): a game
 * - lichess.org/broadcast/tour/round/ROUNDID/GAMEID: one board of a broadcast
 * - lichess.org/broadcast/tour/round/ROUNDID: a broadcast round (its first board)
 */
export function parseLichessLink(link: string): WcLichessLink | undefined {
    let url: URL;
    try {
        url = new URL(link.trim().replace(/^(?!https?:\/\/)/, 'https://'));
    } catch {
        return undefined;
    }
    if (!/^(www\.)?lichess\.org$/.test(url.hostname)) {
        return undefined;
    }
    const segments = url.pathname.split('/').filter(Boolean);

    if (segments[0] === 'broadcast') {
        const roundId = segments[3];
        const gameId = segments[4];
        if (!roundId || !LICHESS_ID.test(roundId)) {
            return undefined;
        }
        if (gameId && LICHESS_ID.test(gameId)) {
            return { kind: 'broadcastGame', id: gameId, gameId, roundId };
        }
        return { kind: 'broadcastRound', id: roundId, roundId };
    }

    const first = segments[0] ?? '';
    if (/^[A-Za-z0-9]{8}([A-Za-z0-9]{4})?$/.test(first)) {
        const gameId = first.slice(0, 8);
        return { kind: 'game', id: gameId, gameId };
    }
    return undefined;
}

/** Where the current PGN of an added game is, with clocks. Lichess allows it from browsers. */
export function customGamePgnUrl(game: WcLichessLink): string {
    switch (game.kind) {
        case 'game':
            return `https://lichess.org/game/export/${game.gameId}?clocks=true&evals=false&opening=false`;
        case 'broadcastGame':
            return `https://lichess.org/api/study/${game.roundId}/${game.gameId}.pgn?clocks=true&comments=false&variations=false`;
        case 'broadcastRound':
            return `https://lichess.org/api/broadcast/round/${game.roundId}.pgn`;
    }
}

export const WcAddGameRequestSchema = z.object({
    url: z.string().trim().min(1).max(300),
    /** Defaults to the players' names. */
    name: z.string().trim().max(40).optional(),
});
export type WcAddGameRequest = z.infer<typeof WcAddGameRequestSchema>;

export const WcRemoveGameRequestSchema = z.object({
    id: z.string().regex(LICHESS_ID),
});
