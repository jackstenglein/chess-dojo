'use strict';

import { Chess } from '@jackstenglein/chess';
import { assert, test } from 'vitest';
import { rateGameTimeManagement } from './timeManagement';

// Real prod game from ChessDojo: Fang (FM 2200) vs Kraai (GM 2385), US Masters 2025
const classicalPgnWithClocks = `[Event "US Masters"]
[Date "2025.11.28"]
[Round "4"]
[White "Fang, Elbert"]
[Black "Kraai"]
[Result "1/2-1/2"]
[WhiteElo "2200"]
[WhiteTitle "FM"]
[BlackElo "2385"]
[BlackTitle "GM"]
[TimeControl "5400+30"]
[PlyCount "91"]

1. e4 {[%clk 1:25:00]} 1... e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Bd7 6. Be2 {[%clk 1:24:00]} 6... Nge7 7. O-O {[%clk 1:22:00]} 7... Ng6 {[%clk 1:33:00]} 8. Bd3 {[%clk 1:15:00]} 8... Be7 {[%clk 1:32:00]} 9. a3 {[%clk 1:14:00]} 9... O-O {[%clk 1:29:00]} 10. Re1 cxd4 {[%clk 1:19:00]} 11. cxd4 Qb6 12. Bc2 {[%clk 00:55:00]} 12... f6 {[%clk 1:16:00]} 13. Nc3 {[%clk 00:51:00]} 13... fxe5 {[%clk 1:16:00]} 14. Bxg6 {[%clk 00:47:00]} 14... hxg6 {[%clk 1:13:00]} 15. dxe5 {[%clk 00:46:00]} 15... Be8 {[%clk 1:10:00]} 16. Be3 {[%clk 00:44:00]} 16... Qd8 {[%clk 1:07:00]} 17. Nd4 {[%clk 00:38:00]} 17... Nxd4 18. Qxd4 b6 {[%clk 1:03:00]} 19. Qg4 {[%clk 00:30:00]} 19... Rf5 {[%clk 1:03:00]} 20. f4 {[%clk 00:27:00]} 20... Bc5 {[%clk 00:52:00]} 21. Rad1 {[%clk 00:25:00]} 21... Qe7 {[%clk 00:45:00]} 22. Kh1 {[%clk 00:22:00]} 22... Bxe3 {[%clk 00:33:00]} 23. Rxe3 g5 {[%clk 00:34:00]} 24. Rf3 {[%clk 00:14:00]} 24... Rd8 {[%clk 00:16:00]} 25. Ne2 {[%clk 00:09:00]} 25... gxf4 26. Nxf4 {[%clk 00:09:00]} 26... Rxe5 {[%clk 00:16:00]} 27. Rdf1 {[%clk 00:09:00]} 27... d4 {[%clk 00:12:00]} 28. Rh3 {[%clk 00:05:00]} 28... Rf5 {[%clk 00:08:00]} 29. Re1 {[%clk 00:05:00]} 29... Qf6 {[%clk 00:06:00]} 30. Rf3 {[%clk 00:03:00]} 30... d3 {[%clk 00:06:00]} 31. Nxe6 {[%clk 00:01:00]} 31... Rxf3 {[%clk 00:02:00]} 32. gxf3 Bd7 {[%clk 00:03:00]} 33. Qc4 {[%clk 00:01:00]} 33... Bxe6 34. Rxe6 Qxf3+ 35. Kg1 Qf7 {[%clk 00:01:00]} 36. Qh4 Rf8 37. Re1 Qg6+ 38. Qg3 d2 39. Rd1 Qc2 40. Qg4 Qc5+ 41. Kh1 Qf2 42. Qe6+ Rf7 43. Qc8+ Kh7 44. Qh3+ Kg6 45. Qd3+ Kh5 46. Qxd2 1/2-1/2`;

const blitzPgn = `[Event "Blitz"]
[TimeControl "180+0"]

1.e4 {[%clk 0:02:58]} e5 {[%clk 0:02:55]} 2.Nf3 {[%clk 0:02:50]} Nc6 {[%clk 0:02:48]} 3.Bb5 {[%clk 0:02:45]} a6 {[%clk 0:02:40]} 1-0`;

const noClocksClassicalPgn = `[Event "Test"]
[TimeControl "5400+30"]

1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 1-0`;

const noTimeControlPgn = `[Event "Test"]

1.e4 {[%clk 1:29:40]} e5 {[%clk 1:29:30]} 2.Nf3 {[%clk 1:29:10]} Nc6 {[%clk 1:28:50]} 1-0`;

test('returns exact ratings for Fang vs Kraai (US Masters 2025)', () => {
    const chess = new Chess({ pgn: classicalPgnWithClocks });
    const ratings = rateGameTimeManagement(chess);

    assert.equal(ratings.white?.rating, 2478);
    assert.equal(ratings.black?.rating, 2456);
    assert.isNumber(ratings.white?.area);
    assert.isNumber(ratings.black?.area);
});

test('returns undefined for blitz game (time control < 30 min)', () => {
    const chess = new Chess({ pgn: blitzPgn });
    const ratings = rateGameTimeManagement(chess);

    assert.isUndefined(ratings.white, 'blitz game should not produce white rating');
    assert.isUndefined(ratings.black, 'blitz game should not produce black rating');
});

test('returns undefined for short classical game without enough moves', () => {
    const shortPgn = `[Event "Test"]
[TimeControl "5400+30"]

1.e4 {[%clk 1:29:40]} e5 {[%clk 1:29:30]} 2.Nf3 {[%clk 1:29:10]} Nc6 {[%clk 1:28:50]} 3.Bb5 {[%clk 1:28:35]} a6 {[%clk 1:28:00]} 1-0`;
    const chess = new Chess({ pgn: shortPgn });
    const ratings = rateGameTimeManagement(chess);

    assert.isUndefined(ratings.white, 'short game should not produce white rating');
    assert.isUndefined(ratings.black, 'short game should not produce black rating');
});

test('returns undefined for classical game without clock annotations', () => {
    const chess = new Chess({ pgn: noClocksClassicalPgn });
    const ratings = rateGameTimeManagement(chess);

    assert.isUndefined(ratings.white, 'no-clock game should not produce white rating');
    assert.isUndefined(ratings.black, 'no-clock game should not produce black rating');
});

test('returns empty for game without TimeControl header', () => {
    const chess = new Chess({ pgn: noTimeControlPgn });
    const ratings = rateGameTimeManagement(chess);

    assert.isUndefined(ratings.white);
    assert.isUndefined(ratings.black);
});

test('getGame populates exact TM rating fields for classical game with clocks', async () => {
    const { getGame } = await import('./create');
    const game = getGame(undefined, classicalPgnWithClocks);

    assert.equal(game.timeManagementRatingWhite, 2478);
    assert.equal(game.timeManagementRatingBlack, 2456);
    assert.isNumber(game.timeManagementAreaWhite);
    assert.isNumber(game.timeManagementAreaBlack);
});

test('getGame does not populate TM rating fields for blitz game', async () => {
    const { getGame } = await import('./create');
    const game = getGame(undefined, blitzPgn);

    assert.isUndefined(game.timeManagementRatingWhite);
    assert.isUndefined(game.timeManagementRatingBlack);
});
