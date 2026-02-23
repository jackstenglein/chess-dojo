'use strict';

import { Chess } from '@jackstenglein/chess';
import { assert, test } from 'vitest';
import { calculateTimeManagementRatings } from './timeManagement';

const classicalPgnWithClocks = `[Event "Leipzig Olympiad Fin"]
[Site "Leipzig GDR"]
[Date "1960.11.08"]
[Round "11"]
[Result "1-0"]
[White "Jonathan Penrose"]
[Black "Mikhail Tal"]
[TimeControl "5400+30"]

1.d4 {[%clk 1:29:40]} Nf6 {[%clk 1:29:30]} 2.c4 {[%clk 1:29:10]} e6 {[%clk 1:28:50]} 3.Nc3 {[%clk 1:28:35]} c5 {[%clk 1:28:00]} 4.d5 {[%clk 1:27:50]} exd5 {[%clk 1:26:45]} 5.cxd5 {[%clk 1:27:20]} d6 {[%clk 1:25:30]} 6.e4 {[%clk 1:26:00]} g6 {[%clk 1:24:10]} 7.Bd3 {[%clk 1:24:15]} Bg7 {[%clk 1:22:40]} 8.Nge2 {[%clk 1:22:30]} O-O {[%clk 1:21:50]} 9.O-O {[%clk 1:21:45]} a6 {[%clk 1:20:30]} 10.a4 {[%clk 1:20:00]} Qc7 {[%clk 1:18:15]} 11.h3 {[%clk 1:18:30]} Nbd7 {[%clk 1:16:00]} 12.f4 {[%clk 1:16:10]} Re8 {[%clk 1:13:20]} 13.Ng3 {[%clk 1:13:45]} c4 {[%clk 1:10:50]} 14.Bc2 {[%clk 1:12:00]} Nc5 {[%clk 1:08:30]} 15.Qf3 {[%clk 1:09:15]} Nfd7 {[%clk 1:05:40]} 16.Be3 {[%clk 1:06:30]} b5 {[%clk 1:02:10]} 17.axb5 {[%clk 1:04:00]} Rb8 {[%clk 0:59:30]} 18.Qf2 {[%clk 1:01:20]} axb5 {[%clk 0:56:45]} 19.e5 {[%clk 0:58:00]} dxe5 {[%clk 0:53:10]} 20.f5 {[%clk 0:55:30]} Bb7 {[%clk 0:49:50]} 21.Rad1 {[%clk 0:52:15]} Ba8 {[%clk 0:46:20]} 22.Nce4 {[%clk 0:48:30]} Na4 {[%clk 0:42:00]} 23.Bxa4 {[%clk 0:45:00]} bxa4 {[%clk 0:39:15]} 24.fxg6 {[%clk 0:42:10]} fxg6 {[%clk 0:36:00]} 25.Qf7+ {[%clk 0:39:30]} Kh8 {[%clk 0:33:45]} 26.Nc5 {[%clk 0:36:00]} Qa7 {[%clk 0:30:20]} 27.Qxd7 {[%clk 0:33:15]} Qxd7 {[%clk 0:27:50]} 28.Nxd7 {[%clk 0:31:00]} Rxb2 {[%clk 0:25:10]} 29.Nb6 {[%clk 0:28:30]} Rb3 {[%clk 0:22:40]} 30.Nxc4 {[%clk 0:26:00]} Rd8 {[%clk 0:20:00]} 31.d6 {[%clk 0:23:15]} Rc3 {[%clk 0:17:30]} 32.Rc1 {[%clk 0:20:45]} Rxc1 {[%clk 0:15:10]} 33.Rxc1 {[%clk 0:19:00]} Bd5 {[%clk 0:12:45]} 34.Nb6 {[%clk 0:16:30]} Bb3 {[%clk 0:10:20]} 35.Ne4 {[%clk 0:14:00]} h6 {[%clk 0:08:15]} 36.d7 {[%clk 0:11:30]} Bf8 {[%clk 0:06:00]} 37.Rc8 {[%clk 0:09:15]} Be7 {[%clk 0:04:10]} 38.Bc5 {[%clk 0:07:00]} Bh4 {[%clk 0:02:30]} 39.g3 {[%clk 0:05:00]} 1-0`;

const blitzPgn = `[Event "Blitz"]
[TimeControl "180+0"]

1.e4 {[%clk 0:02:58]} e5 {[%clk 0:02:55]} 2.Nf3 {[%clk 0:02:50]} Nc6 {[%clk 0:02:48]} 3.Bb5 {[%clk 0:02:45]} a6 {[%clk 0:02:40]} 1-0`;

const noClocksClassicalPgn = `[Event "Test"]
[TimeControl "5400+30"]

1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 1-0`;

const noTimeControlPgn = `[Event "Test"]

1.e4 {[%clk 1:29:40]} e5 {[%clk 1:29:30]} 2.Nf3 {[%clk 1:29:10]} Nc6 {[%clk 1:28:50]} 1-0`;

test('returns ratings for classical game with clocks', () => {
    const chess = new Chess({ pgn: classicalPgnWithClocks });
    const ratings = calculateTimeManagementRatings(chess);

    assert.isDefined(ratings.white, 'white rating should be defined');
    assert.isDefined(ratings.black, 'black rating should be defined');
    assert.isAbove(ratings.white!, 0, 'white rating should be positive');
    assert.isAbove(ratings.black!, 0, 'black rating should be positive');
    assert.isBelow(ratings.white!, 3001, 'white rating should be at most 3000');
    assert.isBelow(ratings.black!, 3001, 'black rating should be at most 3000');
});

test('returns undefined for blitz game (time control < 30 min)', () => {
    const chess = new Chess({ pgn: blitzPgn });
    const ratings = calculateTimeManagementRatings(chess);

    assert.isUndefined(ratings.white, 'blitz game should not produce white rating');
    assert.isUndefined(ratings.black, 'blitz game should not produce black rating');
});

test('returns undefined for short classical game without enough moves', () => {
    const shortPgn = `[Event "Test"]
[TimeControl "5400+30"]

1.e4 {[%clk 1:29:40]} e5 {[%clk 1:29:30]} 2.Nf3 {[%clk 1:29:10]} Nc6 {[%clk 1:28:50]} 3.Bb5 {[%clk 1:28:35]} a6 {[%clk 1:28:00]} 1-0`;
    const chess = new Chess({ pgn: shortPgn });
    const ratings = calculateTimeManagementRatings(chess);

    assert.isUndefined(ratings.white, 'short game should not produce white rating');
    assert.isUndefined(ratings.black, 'short game should not produce black rating');
});

test('returns undefined for classical game without clock annotations', () => {
    const chess = new Chess({ pgn: noClocksClassicalPgn });
    const ratings = calculateTimeManagementRatings(chess);

    assert.isUndefined(ratings.white, 'no-clock game should not produce white rating');
    assert.isUndefined(ratings.black, 'no-clock game should not produce black rating');
});

test('returns empty for game without TimeControl header', () => {
    const chess = new Chess({ pgn: noTimeControlPgn });
    const ratings = calculateTimeManagementRatings(chess);

    assert.isUndefined(ratings.white);
    assert.isUndefined(ratings.black);
});

test('getGame populates TM rating fields for classical game with clocks', async () => {
    const { getGame } = await import('./create');
    const game = getGame(undefined, classicalPgnWithClocks);

    assert.isDefined(
        game.timeManagementRatingWhite,
        'game should have white TM rating',
    );
    assert.isDefined(
        game.timeManagementRatingBlack,
        'game should have black TM rating',
    );
    assert.isAbove(game.timeManagementRatingWhite!, 0);
    assert.isAbove(game.timeManagementRatingBlack!, 0);
});

test('getGame does not populate TM rating fields for blitz game', async () => {
    const { getGame } = await import('./create');
    const game = getGame(undefined, blitzPgn);

    assert.isUndefined(game.timeManagementRatingWhite);
    assert.isUndefined(game.timeManagementRatingBlack);
});
