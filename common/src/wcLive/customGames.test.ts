import { describe, expect, it } from 'vitest';
import { customGamePgnUrl, parseLichessLink } from './customGames';

describe('parseLichessLink', () => {
    it('reads game links, with or without a side or player key', () => {
        expect(parseLichessLink('https://lichess.org/q7ZvsdUF')).toEqual({
            kind: 'game',
            id: 'q7ZvsdUF',
            gameId: 'q7ZvsdUF',
        });
        expect(parseLichessLink('lichess.org/q7ZvsdUF/black')?.gameId).toBe('q7ZvsdUF');
        expect(parseLichessLink('https://lichess.org/q7ZvsdUFab12')?.gameId).toBe('q7ZvsdUF');
    });

    it('reads a broadcast board and a broadcast round', () => {
        expect(
            parseLichessLink(
                'https://lichess.org/broadcast/total-chess-finals/armageddon/NP95wvlW/oYkfPVM7',
            ),
        ).toEqual({
            kind: 'broadcastGame',
            id: 'oYkfPVM7',
            gameId: 'oYkfPVM7',
            roundId: 'NP95wvlW',
        });
        expect(
            parseLichessLink(
                'https://lichess.org/broadcast/total-chess-finals/armageddon/NP95wvlW',
            ),
        ).toEqual({ kind: 'broadcastRound', id: 'NP95wvlW', roundId: 'NP95wvlW' });
    });

    it('refuses other sites and pages', () => {
        expect(parseLichessLink('https://chess.com/game/live/123')).toBeUndefined();
        expect(
            parseLichessLink('https://lichess.org/broadcast/some-tour/qfkdt8mn'),
        ).toBeUndefined();
        expect(parseLichessLink('https://lichess.org/study/abc')).toBeUndefined();
        expect(parseLichessLink('not a link')).toBeUndefined();
    });
});

describe('customGamePgnUrl', () => {
    it('points each kind at its PGN', () => {
        expect(customGamePgnUrl({ kind: 'game', id: 'q7ZvsdUF', gameId: 'q7ZvsdUF' })).toContain(
            '/game/export/q7ZvsdUF?clocks=true',
        );
        expect(
            customGamePgnUrl({
                kind: 'broadcastGame',
                id: 'oYkfPVM7',
                gameId: 'oYkfPVM7',
                roundId: 'NP95wvlW',
            }),
        ).toContain('/api/study/NP95wvlW/oYkfPVM7.pgn');
    });
});
