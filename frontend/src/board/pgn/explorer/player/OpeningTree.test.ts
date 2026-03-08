import { BuildPlayerOpeningTreeResponse } from '@/api/explorerApi';
import { OnlineGameTimeClass } from '@/api/external/onlineGame';
import { GameData } from '@/database/explorer';
import { GameResult } from '@/database/game';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { OpeningTree, PositionData } from './OpeningTree';
import {
    Color,
    GameFilters,
    MAX_DOWNLOAD_LIMIT,
    MAX_PLY_COUNT,
    MIN_PLY_COUNT,
    SourceType,
} from './PlayerSource';

function defined<T>(value: T | undefined | null): T {
    expect(value).toBeDefined();
    return value as T;
}

function makeGame(overrides: Partial<GameData> & { url: string }): GameData {
    return {
        source: { type: SourceType.Lichess, username: 'player1' },
        playerColor: Color.White,
        white: 'player1',
        black: 'opponent1',
        whiteElo: 1500,
        normalizedWhiteElo: 1500,
        blackElo: 1400,
        normalizedBlackElo: 1400,
        result: GameResult.White,
        plyCount: 40,
        rated: true,
        headers: { Date: '2025.01.15' },
        timeClass: OnlineGameTimeClass.Rapid,
        ...overrides,
    };
}

function makeFilters(overrides: Partial<GameFilters> = {}): GameFilters {
    return {
        color: Color.Both,
        win: true,
        draw: true,
        loss: true,
        rated: true,
        casual: true,
        bullet: true,
        blitz: true,
        rapid: true,
        classical: true,
        daily: true,
        opponentRating: [0, 4000],
        downloadLimit: MAX_DOWNLOAD_LIMIT,
        dateRange: ['', ''],
        plyCount: [MIN_PLY_COUNT, MAX_PLY_COUNT],
        hiddenSources: [],
        ...overrides,
    };
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makePosition(
    games: string[],
    moves: { san: string; games: string[] }[] = [],
    wbd: { white: number; black: number; draws: number } = { white: 1, black: 0, draws: 0 },
): PositionData {
    return {
        white: wbd.white,
        black: wbd.black,
        draws: wbd.draws,
        games: new Set(games),
        moves: moves.map((m) => ({
            san: m.san,
            white: wbd.white,
            black: wbd.black,
            draws: wbd.draws,
            games: new Set(m.games),
        })),
    };
}

describe('OpeningTree', () => {
    describe('fromBackendResponse', () => {
        it('deserializes games from backend response', () => {
            const tree = OpeningTree.fromBackendResponse({
                positions: {},
                games: {
                    'https://lichess.org/abc': {
                        source: { type: 'lichess' },
                        playerColor: 'white',
                        white: 'player1',
                        black: 'opponent1',
                        whiteElo: 1500,
                        blackElo: 1400,
                        result: '1-0',
                        plyCount: 40,
                        rated: true,
                        url: 'https://lichess.org/abc',
                        headers: { Date: '2025.01.15' },
                        timeClass: 'rapid',
                    },
                },
            });

            const game = defined(tree.getGame('https://lichess.org/abc'));
            expect(game.source.type).toBe(SourceType.Lichess);
            expect(game.playerColor).toBe(Color.White);
            expect(game.timeClass).toBe(OnlineGameTimeClass.Rapid);
            expect(game.result).toBe('1-0');
        });

        it('deserializes chesscom games with black player color', () => {
            const tree = OpeningTree.fromBackendResponse({
                positions: {},
                games: {
                    'https://chess.com/game/123': {
                        source: { type: 'chesscom' },
                        playerColor: 'black',
                        white: 'opponent1',
                        black: 'player1',
                        whiteElo: 1600,
                        blackElo: 1500,
                        result: '0-1',
                        plyCount: 50,
                        rated: false,
                        url: 'https://chess.com/game/123',
                        headers: { Date: '2025.02.01' },
                        timeClass: 'blitz',
                    },
                },
            });

            const game = defined(tree.getGame('https://chess.com/game/123'));
            expect(game.source.type).toBe(SourceType.Chesscom);
            expect(game.playerColor).toBe(Color.Black);
            expect(game.source.username).toBe('player1');
            expect(game.timeClass).toBe(OnlineGameTimeClass.Blitz);
        });

        it('deserializes positions with moves and game sets', () => {
            const tree = OpeningTree.fromBackendResponse({
                positions: {
                    [START_FEN]: {
                        white: 3,
                        black: 1,
                        draws: 1,
                        games: ['url1', 'url2'],
                        moves: [
                            { san: 'e4', white: 2, black: 0, draws: 1, games: ['url1'] },
                            { san: 'd4', white: 1, black: 1, draws: 0, games: ['url2'] },
                        ],
                    },
                },
                games: {
                    url1: {
                        source: { type: 'lichess' },
                        playerColor: 'white',
                        white: 'p1',
                        black: 'p2',
                        whiteElo: 1500,
                        blackElo: 1400,
                        result: '1-0',
                        plyCount: 30,
                        rated: true,
                        url: 'url1',
                        headers: { Date: '2025.01.01' },
                        timeClass: 'rapid',
                    },
                    url2: {
                        source: { type: 'lichess' },
                        playerColor: 'white',
                        white: 'p1',
                        black: 'p3',
                        whiteElo: 1500,
                        blackElo: 1600,
                        result: '0-1',
                        plyCount: 45,
                        rated: true,
                        url: 'url2',
                        headers: { Date: '2025.02.01' },
                        timeClass: 'blitz',
                    },
                },
            });

            const filters = makeFilters();
            const position = defined(tree.getPosition(START_FEN, filters));
            expect(position.moves.length).toBe(2);
        });

        it('handles null moves and games arrays in backend response', () => {
            const tree = OpeningTree.fromBackendResponse({
                positions: {
                    [START_FEN]: {
                        white: 0,
                        black: 0,
                        draws: 0,
                        moves: null,
                        games: [],
                    },
                },
                games: {},
            });

            const position = defined(tree.getPosition(START_FEN, makeFilters()));
            expect(position.moves).toEqual([]);
        });

        it('maps time classes correctly', () => {
            const timeClasses = ['bullet', 'blitz', 'rapid', 'classical', 'correspondence'];
            const expected = [
                OnlineGameTimeClass.Bullet,
                OnlineGameTimeClass.Blitz,
                OnlineGameTimeClass.Rapid,
                OnlineGameTimeClass.Classical,
                OnlineGameTimeClass.Daily,
            ];

            for (let i = 0; i < timeClasses.length; i++) {
                const tree = OpeningTree.fromBackendResponse({
                    positions: {},
                    games: {
                        [`url${i}`]: {
                            source: { type: 'lichess' },
                            playerColor: 'white',
                            white: 'p1',
                            black: 'p2',
                            whiteElo: 1500,
                            blackElo: 1400,
                            result: '1-0',
                            plyCount: 30,
                            rated: true,
                            url: `url${i}`,
                            headers: {},
                            timeClass: timeClasses[i],
                        },
                    },
                });
                expect(defined(tree.getGame(`url${i}`)).timeClass).toBe(expected[i]);
            }
        });
    });

    describe('getPosition', () => {
        it('returns undefined for unknown FEN', () => {
            const tree = new OpeningTree();
            const result = tree.getPosition('8/8/8/8/8/8/8/8 w - - 0 1', makeFilters());
            expect(result).toBeUndefined();
        });

        it('filters out games that do not match and recalculates W/D/L', () => {
            const game1 = makeGame({
                url: 'url1',
                result: GameResult.White,
                playerColor: Color.White,
                headers: { Date: '2025.01.01' },
            });
            const game2 = makeGame({
                url: 'url2',
                result: GameResult.Black,
                playerColor: Color.Black,
                timeClass: OnlineGameTimeClass.Bullet,
                headers: { Date: '2025.02.01' },
            });

            const positionData = new Map<string, PositionData>();
            positionData.set(
                START_FEN,
                makePosition(['url1', 'url2'], [{ san: 'e4', games: ['url1', 'url2'] }], {
                    white: 1,
                    black: 1,
                    draws: 0,
                }),
            );

            const gameData = new Map<string, GameData>();
            gameData.set('url1', game1);
            gameData.set('url2', game2);

            const tree = new OpeningTree(positionData, gameData);

            // Filter out bullet games - only game1 (rapid) should remain
            const filters = makeFilters({ bullet: false });
            const position = defined(tree.getPosition(START_FEN, filters));

            expect(position.white).toBe(1);
            expect(position.black).toBe(0);
            expect(position.draws).toBe(0);
        });

        it('caches position results for same filters', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2025.01.01' } });
            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition(['url1'], [{ san: 'e4', games: ['url1'] }]));
            const gameData = new Map<string, GameData>();
            gameData.set('url1', game1);

            const tree = new OpeningTree(positionData, gameData);
            const filters = makeFilters();

            const result1 = tree.getPosition(START_FEN, filters);
            const result2 = tree.getPosition(START_FEN, filters);
            expect(result1).toBe(result2); // same reference = cached
        });
    });

    describe('getGames', () => {
        it('returns empty array for unknown FEN', () => {
            const tree = new OpeningTree();
            const result = tree.getGames('8/8/8/8/8/8/8/8 w - - 0 1', makeFilters());
            expect(result).toEqual([]);
        });

        it('returns games matching the position and filters', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2025.01.01' } });
            const game2 = makeGame({
                url: 'url2',
                timeClass: OnlineGameTimeClass.Bullet,
                headers: { Date: '2025.02.01' },
            });

            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition(['url1', 'url2']));
            const gameData = new Map<string, GameData>();
            gameData.set('url1', game1);
            gameData.set('url2', game2);

            const tree = new OpeningTree(positionData, gameData);

            // Filter out bullet
            const games = tree.getGames(START_FEN, makeFilters({ bullet: false }));
            expect(games).toHaveLength(1);
            expect(games[0].url).toBe('url1');
        });

        it('returns games sorted by date descending', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2024.06.01' } });
            const game2 = makeGame({ url: 'url2', headers: { Date: '2025.03.01' } });
            const game3 = makeGame({ url: 'url3', headers: { Date: '2024.12.01' } });

            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition(['url1', 'url2', 'url3']));
            const gameData = new Map<string, GameData>();
            gameData.set('url1', game1);
            gameData.set('url2', game2);
            gameData.set('url3', game3);

            const tree = new OpeningTree(positionData, gameData);
            const games = tree.getGames(START_FEN, makeFilters());

            expect(games[0].url).toBe('url2');
            expect(games[1].url).toBe('url3');
            expect(games[2].url).toBe('url1');
        });

        it('respects download limit by keeping most recent games', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2024.01.01' } });
            const game2 = makeGame({ url: 'url2', headers: { Date: '2025.06.01' } });
            const game3 = makeGame({ url: 'url3', headers: { Date: '2025.03.01' } });

            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition(['url1', 'url2', 'url3']));
            const gameData = new Map<string, GameData>();
            gameData.set('url1', game1);
            gameData.set('url2', game2);
            gameData.set('url3', game3);

            const tree = new OpeningTree(positionData, gameData);
            // downloadLimit=2 means only the 2 most recent games
            const games = tree.getGames(START_FEN, makeFilters({ downloadLimit: 2 }));

            expect(games).toHaveLength(2);
            const urls = games.map((g) => g.url);
            expect(urls).toContain('url2');
            expect(urls).toContain('url3');
            expect(urls).not.toContain('url1');
        });
    });

    describe('merge', () => {
        it('merges two disjoint trees', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2025.01.01' } });
            const game2 = makeGame({ url: 'url2', headers: { Date: '2025.02.01' } });

            const fen1 = START_FEN;
            const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

            const pos1 = new Map<string, PositionData>();
            pos1.set(fen1, makePosition(['url1'], [{ san: 'e4', games: ['url1'] }]));
            const games1 = new Map<string, GameData>();
            games1.set('url1', game1);
            const tree1 = new OpeningTree(pos1, games1);

            const pos2 = new Map<string, PositionData>();
            pos2.set(fen2, makePosition(['url2'], [{ san: 'e5', games: ['url2'] }]));
            const games2 = new Map<string, GameData>();
            games2.set('url2', game2);
            const tree2 = new OpeningTree(pos2, games2);

            tree1.merge(tree2);

            expect(tree1.getGameCount()).toBe(2);
            expect(tree1.getGame('url1')).toBeDefined();
            expect(tree1.getGame('url2')).toBeDefined();

            const filters = makeFilters();
            expect(tree1.getPosition(fen1, filters)).toBeDefined();
            expect(tree1.getPosition(fen2, filters)).toBeDefined();
        });

        it('merges overlapping positions with different games', () => {
            const game1 = makeGame({
                url: 'url1',
                result: GameResult.White,
                headers: { Date: '2025.01.01' },
            });
            const game2 = makeGame({
                url: 'url2',
                result: GameResult.Black,
                headers: { Date: '2025.02.01' },
            });

            const pos1 = new Map<string, PositionData>();
            pos1.set(
                START_FEN,
                makePosition(['url1'], [{ san: 'e4', games: ['url1'] }], {
                    white: 1,
                    black: 0,
                    draws: 0,
                }),
            );
            const games1 = new Map<string, GameData>();
            games1.set('url1', game1);
            const tree1 = new OpeningTree(pos1, games1);

            const pos2 = new Map<string, PositionData>();
            pos2.set(
                START_FEN,
                makePosition(['url2'], [{ san: 'd4', games: ['url2'] }], {
                    white: 0,
                    black: 1,
                    draws: 0,
                }),
            );
            const games2 = new Map<string, GameData>();
            games2.set('url2', game2);
            const tree2 = new OpeningTree(pos2, games2);

            tree1.merge(tree2);

            const filters = makeFilters();
            const position = defined(tree1.getPosition(START_FEN, filters));
            expect(position.white).toBe(1);
            expect(position.black).toBe(1);
            expect(position.moves).toHaveLength(2);
        });

        it('merges overlapping moves with same SAN', () => {
            const game1 = makeGame({
                url: 'url1',
                result: GameResult.White,
                headers: { Date: '2025.01.01' },
            });
            const game2 = makeGame({
                url: 'url2',
                result: GameResult.Draw,
                headers: { Date: '2025.02.01' },
            });

            const pos1 = new Map<string, PositionData>();
            pos1.set(
                START_FEN,
                makePosition(['url1'], [{ san: 'e4', games: ['url1'] }], {
                    white: 1,
                    black: 0,
                    draws: 0,
                }),
            );
            const games1 = new Map<string, GameData>();
            games1.set('url1', game1);
            const tree1 = new OpeningTree(pos1, games1);

            const pos2 = new Map<string, PositionData>();
            pos2.set(
                START_FEN,
                makePosition(['url2'], [{ san: 'e4', games: ['url2'] }], {
                    white: 0,
                    black: 0,
                    draws: 1,
                }),
            );
            const games2 = new Map<string, GameData>();
            games2.set('url2', game2);
            const tree2 = new OpeningTree(pos2, games2);

            tree1.merge(tree2);

            const filters = makeFilters();
            const position = defined(tree1.getPosition(START_FEN, filters));
            expect(position.white).toBe(1);
            expect(position.draws).toBe(1);
            expect(position.moves).toHaveLength(1);
            expect(position.moves[0].san).toBe('e4');
            expect(position.moves[0].white).toBe(1);
            expect(position.moves[0].draws).toBe(1);
        });

        it('merges with empty tree as identity', () => {
            const game1 = makeGame({ url: 'url1', headers: { Date: '2025.01.01' } });
            const pos1 = new Map<string, PositionData>();
            pos1.set(START_FEN, makePosition(['url1'], [{ san: 'e4', games: ['url1'] }]));
            const games1 = new Map<string, GameData>();
            games1.set('url1', game1);
            const tree1 = new OpeningTree(pos1, games1);

            const emptyTree = new OpeningTree();

            tree1.merge(emptyTree);

            expect(tree1.getGameCount()).toBe(1);
            expect(tree1.getGame('url1')).toBeDefined();

            const filters = makeFilters();
            const position = defined(tree1.getPosition(START_FEN, filters));
            expect(position.white).toBe(1);
            expect(position.moves).toHaveLength(1);

            // Also test merging into empty tree
            const emptyTree2 = new OpeningTree();
            emptyTree2.merge(tree1);

            expect(emptyTree2.getGameCount()).toBe(1);
            const position2 = defined(emptyTree2.getPosition(START_FEN, filters));
            expect(position2.white).toBe(1);
        });
    });

    describe('matchesFilter (via getGames)', () => {
        function treeWithGame(game: GameData): OpeningTree {
            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition([game.url]));
            const gameData = new Map<string, GameData>();
            gameData.set(game.url, game);
            return new OpeningTree(positionData, gameData);
        }

        it('filters by color', () => {
            const game = makeGame({ url: 'url1', playerColor: Color.White });
            const tree = treeWithGame(game);

            expect(tree.getGames(START_FEN, makeFilters({ color: Color.White }))).toHaveLength(1);
            expect(tree.getGames(START_FEN, makeFilters({ color: Color.Black }))).toHaveLength(0);
            expect(tree.getGames(START_FEN, makeFilters({ color: Color.Both }))).toHaveLength(1);
        });

        it('filters by win/draw/loss', () => {
            const winGame = makeGame({
                url: 'url1',
                result: GameResult.White,
                playerColor: Color.White,
            });
            const lossGame = makeGame({
                url: 'url2',
                result: GameResult.Black,
                playerColor: Color.White,
            });
            const drawGame = makeGame({
                url: 'url3',
                result: GameResult.Draw,
                playerColor: Color.White,
            });

            const winTree = treeWithGame(winGame);
            const lossTree = treeWithGame(lossGame);
            const drawTree = treeWithGame(drawGame);

            // Exclude wins
            expect(winTree.getGames(START_FEN, makeFilters({ win: false }))).toHaveLength(0);
            expect(lossTree.getGames(START_FEN, makeFilters({ win: false }))).toHaveLength(1);

            // Exclude draws
            expect(drawTree.getGames(START_FEN, makeFilters({ draw: false }))).toHaveLength(0);
            expect(winTree.getGames(START_FEN, makeFilters({ draw: false }))).toHaveLength(1);

            // Exclude losses
            expect(lossTree.getGames(START_FEN, makeFilters({ loss: false }))).toHaveLength(0);
            expect(winTree.getGames(START_FEN, makeFilters({ loss: false }))).toHaveLength(1);
        });

        it('filters by rated/casual', () => {
            const ratedGame = makeGame({ url: 'url1', rated: true });
            const casualGame = makeGame({ url: 'url2', rated: false });

            const ratedTree = treeWithGame(ratedGame);
            const casualTree = treeWithGame(casualGame);

            // Exclude rated
            expect(ratedTree.getGames(START_FEN, makeFilters({ rated: false }))).toHaveLength(0);
            expect(casualTree.getGames(START_FEN, makeFilters({ rated: false }))).toHaveLength(1);

            // Exclude casual
            expect(casualTree.getGames(START_FEN, makeFilters({ casual: false }))).toHaveLength(0);
            expect(ratedTree.getGames(START_FEN, makeFilters({ casual: false }))).toHaveLength(1);
        });

        it('does not filter by date range client-side (handled server-side)', () => {
            const game = makeGame({ url: 'url1', headers: { Date: '2025.06.15' } });
            const tree = treeWithGame(game);

            // Date range filters are now applied server-side via since/until in BuildRequest.
            // Client-side filtering should pass all games regardless of dateRange values.
            expect(
                tree.getGames(START_FEN, makeFilters({ dateRange: ['2025.07.01', ''] })),
            ).toHaveLength(1);
            expect(
                tree.getGames(START_FEN, makeFilters({ dateRange: ['', '2025.05.01'] })),
            ).toHaveLength(1);
        });

        it('filters by opponent rating', () => {
            const game = makeGame({
                url: 'url1',
                playerColor: Color.White,
                blackElo: 1400,
            });
            const tree = treeWithGame(game);

            // Opponent (black) rating 1400 is within range
            expect(
                tree.getGames(START_FEN, makeFilters({ opponentRating: [1300, 1500] })),
            ).toHaveLength(1);

            // Opponent rating below range
            expect(
                tree.getGames(START_FEN, makeFilters({ opponentRating: [1500, 2000] })),
            ).toHaveLength(0);

            // Opponent rating above range
            expect(
                tree.getGames(START_FEN, makeFilters({ opponentRating: [1000, 1300] })),
            ).toHaveLength(0);
        });

        it('filters by time class', () => {
            const timeClasses: [OnlineGameTimeClass, keyof GameFilters][] = [
                [OnlineGameTimeClass.Bullet, 'bullet'],
                [OnlineGameTimeClass.Blitz, 'blitz'],
                [OnlineGameTimeClass.Rapid, 'rapid'],
                [OnlineGameTimeClass.Classical, 'classical'],
                [OnlineGameTimeClass.Daily, 'daily'],
            ];

            for (const [tc, filterKey] of timeClasses) {
                const game = makeGame({ url: `url-${tc}`, timeClass: tc });
                const tree = treeWithGame(game);

                // Included by default
                expect(tree.getGames(START_FEN, makeFilters())).toHaveLength(1);

                // Excluded when filter is false
                expect(tree.getGames(START_FEN, makeFilters({ [filterKey]: false }))).toHaveLength(
                    0,
                );
            }
        });

        it('filters by ply count', () => {
            const game = makeGame({ url: 'url1', plyCount: 40 });
            const tree = treeWithGame(game);

            // Within range
            expect(tree.getGames(START_FEN, makeFilters({ plyCount: [20, 60] }))).toHaveLength(1);

            // Below minimum
            expect(
                tree.getGames(START_FEN, makeFilters({ plyCount: [50, MAX_PLY_COUNT] })),
            ).toHaveLength(0);

            // Above maximum (non-MAX_PLY_COUNT)
            expect(
                tree.getGames(START_FEN, makeFilters({ plyCount: [MIN_PLY_COUNT, 30] })),
            ).toHaveLength(0);

            // MAX_PLY_COUNT upper bound means no upper limit
            expect(
                tree.getGames(START_FEN, makeFilters({ plyCount: [MIN_PLY_COUNT, MAX_PLY_COUNT] })),
            ).toHaveLength(1);
        });

        it('filters by hidden sources', () => {
            const game = makeGame({
                url: 'url1',
                source: { type: SourceType.Lichess, username: 'player1' },
            });
            const tree = treeWithGame(game);

            // Not hidden
            expect(tree.getGames(START_FEN, makeFilters({ hiddenSources: [] }))).toHaveLength(1);

            // Hidden
            expect(
                tree.getGames(
                    START_FEN,
                    makeFilters({
                        hiddenSources: [{ type: SourceType.Lichess, username: 'player1' }],
                    }),
                ),
            ).toHaveLength(0);

            // Different source not hidden
            expect(
                tree.getGames(
                    START_FEN,
                    makeFilters({
                        hiddenSources: [{ type: SourceType.Chesscom, username: 'player1' }],
                    }),
                ),
            ).toHaveLength(1);
        });

        it('handles empty tree', () => {
            const tree = new OpeningTree();
            expect(tree.getGames(START_FEN, makeFilters())).toEqual([]);
            expect(tree.getPosition(START_FEN, makeFilters())).toBeUndefined();
            expect(tree.getGameCount()).toBe(0);
        });

        it('handles all games filtered out', () => {
            const game = makeGame({
                url: 'url1',
                timeClass: OnlineGameTimeClass.Bullet,
                headers: { Date: '2025.01.01' },
            });

            const positionData = new Map<string, PositionData>();
            positionData.set(START_FEN, makePosition(['url1'], [{ san: 'e4', games: ['url1'] }]));
            const gameData = new Map<string, GameData>();
            gameData.set('url1', game);

            const tree = new OpeningTree(positionData, gameData);
            const filters = makeFilters({ bullet: false });

            const games = tree.getGames(START_FEN, filters);
            expect(games).toHaveLength(0);

            const position = defined(tree.getPosition(START_FEN, filters));
            expect(position.white).toBe(0);
            expect(position.black).toBe(0);
            expect(position.draws).toBe(0);
            expect(position.moves).toHaveLength(0);
        });
    });

    describe('contract: golden file', () => {
        const goldenPath = path.resolve(
            __dirname,
            '../../../../../../backend/openingTreeService/api/testdata/contract.golden.json',
        );
        const golden = JSON.parse(
            fs.readFileSync(goldenPath, 'utf-8'),
        ) as BuildPlayerOpeningTreeResponse;

        it('parses the golden file without errors', () => {
            const tree = OpeningTree.fromBackendResponse(golden);
            expect(tree.getGameCount()).toBe(Object.keys(golden.games).length);
        });

        it('populates all positions from the golden file', () => {
            const tree = OpeningTree.fromBackendResponse(golden);
            const filters = makeFilters();

            for (const fen of Object.keys(golden.positions)) {
                const pos = tree.getPosition(fen, filters);
                expect(pos, `position missing for FEN: ${fen}`).toBeDefined();
            }
        });

        it('preserves position stats from the golden file', () => {
            const tree = OpeningTree.fromBackendResponse(golden);
            const filters = makeFilters();

            for (const [fen, bp] of Object.entries(golden.positions)) {
                const pos = defined(tree.getPosition(fen, filters));
                expect(pos.white).toBe(bp.white);
                expect(pos.black).toBe(bp.black);
                expect(pos.draws).toBe(bp.draws);
            }
        });

        it('preserves move data from the golden file', () => {
            const tree = OpeningTree.fromBackendResponse(golden);
            const filters = makeFilters();

            for (const [fen, bp] of Object.entries(golden.positions)) {
                const pos = defined(tree.getPosition(fen, filters));
                const goldenMoves = bp.moves ?? [];
                expect(pos.moves).toHaveLength(goldenMoves.length);

                for (const gm of goldenMoves) {
                    const move = defined(pos.moves.find((m) => m.san === gm.san));
                    expect(move.white).toBe(gm.white);
                    expect(move.black).toBe(gm.black);
                    expect(move.draws).toBe(gm.draws);
                }
            }
        });

        it('preserves game metadata from the golden file', () => {
            const tree = OpeningTree.fromBackendResponse(golden);

            for (const [url, bg] of Object.entries(golden.games)) {
                const game = defined(tree.getGame(url));
                expect(game.white).toBe(bg.white);
                expect(game.black).toBe(bg.black);
                expect(game.whiteElo).toBe(bg.whiteElo);
                expect(game.blackElo).toBe(bg.blackElo);
                expect(game.result).toBe(bg.result);
                expect(game.plyCount).toBe(bg.plyCount);
                expect(game.rated).toBe(bg.rated);
                expect(game.url).toBe(bg.url);
                expect(game.timeClass).toBeDefined();
                expect(game.playerColor).toBeDefined();
                expect(game.source).toBeDefined();
                expect(game.source.type).toBeDefined();
            }
        });

        it('maps game fields to correct typed values', () => {
            const tree = OpeningTree.fromBackendResponse(golden);
            const bg = golden.games['https://lichess.org/contract1'];
            const game = defined(tree.getGame('https://lichess.org/contract1'));

            expect(game.source.type).toBe(SourceType.Lichess);
            expect(game.playerColor).toBe(Color.White);
            expect(game.timeClass).toBe(OnlineGameTimeClass.Blitz);
            expect(game.headers.Event).toBe(bg.headers.Event);
        });
    });
});
