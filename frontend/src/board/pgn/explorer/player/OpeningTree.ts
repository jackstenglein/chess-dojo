import { OnlineGameTimeClass } from '@/api/external/onlineGame';
import { GameData, LichessExplorerMove, LichessExplorerPosition } from '@/database/explorer';
import { GameResult } from '@/database/game';
import { logger } from '@/logging/logger';
import { Chess, normalizeFen } from '@jackstenglein/chess';
import { fideDpTable } from '@jackstenglein/chess-dojo-common/src/ratings/performanceRating';
import deepEqual from 'deep-equal';
import {
    Color,
    GameFilters,
    MAX_DOWNLOAD_LIMIT,
    MAX_PLY_COUNT,
    MIN_PLY_COUNT,
} from './PlayerSource';

interface PositionDataMove extends LichessExplorerMove {
    /**
     * A set of URLs of the games that played this move.
     */
    games: Set<string>;
}

export interface PositionData extends LichessExplorerPosition {
    /** The moves played from this position, ordered from most common to least common. */
    moves: PositionDataMove[];
    /**
     * A set of URLs of the games played in this position. Empty
     * for the starting position.
     */
    games: Set<string>;
}

export class OpeningTree {
    /** A map from the normalized FEN of a position to its data. */
    private positionData: Map<string, PositionData>;
    /** A map from the URL of a game to its data. */
    private gameData: Map<string, GameData>;

    /** The last applied filters when mostRecentGames was calculated. */
    private filters: GameFilters | undefined;
    /** A list of all game URLs, sorted by date. */
    private gamesSortedByDate: string[] | undefined;
    /** A set of the most recent game URLs matching the filters. */
    private mostRecentGames: Set<string> | undefined;

    constructor(positionData?: Map<string, PositionData>, gameData?: Map<string, GameData>) {
        this.positionData = new Map<string, PositionData>(positionData);
        this.gameData = new Map<string, GameData>(gameData);
    }

    /**
     * Returns a new OpeningTree which is a copy of the given tree.
     * @param other The OpeningTree to create a copy of.
     */
    static fromTree(other: OpeningTree): OpeningTree {
        return new OpeningTree(other.positionData, other.gameData);
    }

    /**
     * Returns true if the provided filters exactly matches the OpeningTree's filters.
     * @param filters The filters to check.
     */
    private equalFilters(filters: GameFilters) {
        return deepEqual(this.filters, filters, { strict: true });
    }

    /**
     * Sets the filters if they are different from the current filters. If the filters
     * are different and have a download limit, the most recent games are recalculated.
     * If the filters are different and do not have a download limit, the most recent
     * games are cleared.
     * @param filters The filters to set.
     */
    private setFiltersIfNecessary(filters: GameFilters) {
        if (this.equalFilters(filters)) {
            return;
        }

        this.filters = filters;
        if (this.filters.downloadLimit === MAX_DOWNLOAD_LIMIT) {
            this.mostRecentGames = undefined;
            return;
        }
        this.calculateMostRecentGames();
    }

    /**
     * Calculates and saves the list of most recent games matching the current filters.
     */
    private calculateMostRecentGames() {
        if (this.gamesSortedByDate?.length !== this.gameData.size) {
            this.gamesSortedByDate = [...this.gameData.values()]
                .sort((lhs: GameData, rhs: GameData) =>
                    rhs.headers.Date.localeCompare(lhs.headers.Date),
                )
                .map((g) => g.url);
        }

        const matchingGames = this.gamesSortedByDate.filter((url) =>
            matchesFilter(this.getGame(url), this.filters),
        );
        this.mostRecentGames = new Set(matchingGames.slice(0, this.filters?.downloadLimit));
    }

    /** Adds the given game to the game data map. */
    setGame(game: GameData) {
        this.gameData.set(game.url, game);
    }

    /**
     * Returns the game with the given URL.
     * @param url The URL of the game to get.
     */
    getGame(url: string): GameData | undefined {
        return this.gameData.get(url);
    }

    /**
     * Returns a list of games matching the given FEN and filters.
     * @param fen The un-normalized FEN to fetch games for.
     * @param filters The filters to apply to the games.
     */
    getGames(fen: string, filters: GameFilters): GameData[] {
        fen = normalizeFen(fen);
        const position = this.positionData.get(fen);
        if (!position) {
            return [];
        }

        this.setFiltersIfNecessary(filters);
        const result = [];
        for (const url of position.games) {
            const game = this.getGame(url);
            if (
                game &&
                (this.mostRecentGames?.has(url) ||
                    (!this.mostRecentGames && matchesFilter(game, this.filters)))
            ) {
                result.push(game);
            }
        }
        return result.sort((lhs, rhs) =>
            (rhs.headers.Date ?? '').localeCompare(lhs.headers.Date ?? ''),
        );
    }

    /** Returns the number of games indexed by this opening tree. */
    getGameCount(): number {
        return this.gameData.size;
    }

    /**
     * Sets the position data for the given FEN.
     * @param fen The un-normalized FEN to set the data for.
     * @param position The position to set.
     */
    setPosition(fen: string, position: PositionData) {
        fen = normalizeFen(fen);
        this.positionData.set(fen, position);
    }

    /**
     * Gets the position data for the given FEN and filters. Games which
     * do not match the filters are removed from the position data's W/D/L
     * and move counts.
     * @param fen The un-normalized FEN to get the position data for.
     * @param filters The filters to apply to the data.
     * @returns The position data for the given FEN and filters.
     */
    getPosition(fen: string, filters: GameFilters) {
        fen = normalizeFen(fen);
        const position = this.positionData.get(fen);
        if (!position) {
            return position;
        }

        this.setFiltersIfNecessary(filters);

        let white = 0;
        let black = 0;
        let draws = 0;
        let playerWins = 0;
        let totalOpponentRating = 0;

        let lastPlayed: GameData | undefined = undefined;
        let bestWin: GameData | undefined = undefined;
        let worstLoss: GameData | undefined = undefined;

        for (const url of position.games) {
            const game = this.getGame(url);
            if (
                !game ||
                (!this.mostRecentGames?.has(url) &&
                    (this.mostRecentGames || !matchesFilter(game, this.filters)))
            ) {
                continue;
            }

            if (game.headers.Date > (lastPlayed?.headers.Date ?? '')) {
                lastPlayed = game;
            }

            if (game.result === GameResult.White) {
                white++;
                if (game.playerColor === Color.White) {
                    playerWins++;
                    if (game.normalizedBlackElo > (bestWin?.normalizedBlackElo ?? 0)) {
                        bestWin = game;
                    }
                } else if (game.normalizedWhiteElo < (worstLoss?.normalizedWhiteElo ?? Infinity)) {
                    worstLoss = game;
                }
            } else if (game.result === GameResult.Black) {
                black++;
                if (game.playerColor === Color.Black) {
                    playerWins++;
                    if (game.normalizedWhiteElo > (bestWin?.normalizedWhiteElo ?? 0)) {
                        bestWin = game;
                    }
                } else if (game.normalizedBlackElo < (worstLoss?.normalizedBlackElo ?? Infinity)) {
                    worstLoss = game;
                }
            } else {
                draws++;
            }

            if (game.playerColor === Color.White) {
                totalOpponentRating += game.normalizedBlackElo;
            } else {
                totalOpponentRating += game.normalizedWhiteElo;
            }
        }

        const moves = position.moves
            .map((move) => {
                let white = 0;
                let black = 0;
                let draws = 0;
                let playerWins = 0;
                let totalOpponentRating = 0;

                let lastPlayed: GameData | undefined = undefined;
                let bestWin: GameData | undefined = undefined;
                let worstLoss: GameData | undefined = undefined;

                for (const url of move.games) {
                    const game = this.getGame(url);
                    if (
                        !game ||
                        (!this.mostRecentGames?.has(url) &&
                            (this.mostRecentGames || !matchesFilter(game, this.filters)))
                    ) {
                        continue;
                    }

                    if (game.headers.Date > (lastPlayed?.headers.Date ?? '')) {
                        lastPlayed = game;
                    }

                    if (game.result === GameResult.White) {
                        white++;
                        if (game.playerColor === Color.White) {
                            playerWins++;
                            if (game.normalizedBlackElo > (bestWin?.normalizedBlackElo ?? 0)) {
                                bestWin = game;
                            }
                        } else if (
                            game.normalizedWhiteElo < (worstLoss?.normalizedWhiteElo ?? Infinity)
                        ) {
                            worstLoss = game;
                        }
                    } else if (game.result === GameResult.Black) {
                        black++;
                        if (game.playerColor === Color.Black) {
                            playerWins++;
                            if (game.normalizedWhiteElo > (bestWin?.normalizedWhiteElo ?? 0)) {
                                bestWin = game;
                            }
                        } else if (
                            game.normalizedBlackElo < (worstLoss?.normalizedBlackElo ?? Infinity)
                        ) {
                            worstLoss = game;
                        }
                    } else {
                        draws++;
                    }

                    if (game.playerColor === Color.White) {
                        totalOpponentRating += game.normalizedBlackElo;
                    } else {
                        totalOpponentRating += game.normalizedWhiteElo;
                    }
                }
                const result = { ...move, white, black, draws };
                const totalGames = white + black + draws;
                if (lastPlayed && totalGames > 0) {
                    const score = playerWins + draws / 2;
                    const percentage = (score / totalGames) * 100;
                    const ratingDiff = fideDpTable[Math.round(percentage)];
                    const averageOpponentRating = Math.round(totalOpponentRating / totalGames);
                    const performanceRating = averageOpponentRating + ratingDiff;

                    result.performanceData = {
                        playerWins,
                        playerDraws: draws,
                        playerLosses: totalGames - playerWins - draws,
                        performanceRating,
                        averageOpponentRating,
                        lastPlayed,
                        bestWin,
                        worstLoss,
                    };
                }
                return result;
            })
            .filter((m) => m.white || m.black || m.draws)
            .sort(
                (lhs, rhs) =>
                    rhs.white + rhs.black + rhs.draws - (lhs.white + lhs.black + lhs.draws),
            );

        const result = { ...position, white, black, draws, moves };

        const totalGames = white + black + draws;
        if (lastPlayed && totalGames > 0) {
            const score = playerWins + draws / 2;
            const percentage = (score / totalGames) * 100;
            const ratingDiff = fideDpTable[Math.round(percentage)];
            const averageOpponentRating = Math.round(totalOpponentRating / totalGames);
            const performanceRating = averageOpponentRating + ratingDiff;

            result.performanceData = {
                playerWins,
                playerDraws: draws,
                playerLosses: totalGames - playerWins - draws,
                performanceRating,
                averageOpponentRating,
                lastPlayed,
                bestWin,
                worstLoss,
            };
        }

        return result;
    }

    /**
     * Merges the given position data with the existing position data for the FEN.
     * @param fen The un-normalized FEN of the position.
     * @param position The data to merge into the existing data.
     */
    mergePosition(fen: string, position: PositionData) {
        fen = normalizeFen(fen);
        const existingPosition = this.positionData.get(fen);
        if (!existingPosition) {
            this.positionData.set(fen, position);
        } else {
            existingPosition.white += position.white;
            existingPosition.black += position.black;
            existingPosition.draws += position.draws;
            for (const g of position.games) {
                existingPosition.games.add(g);
            }

            for (const move of position.moves) {
                const existingMove = existingPosition.moves.find((m) => m.san === move.san);
                if (!existingMove) {
                    existingPosition.moves.push(move);
                } else {
                    existingMove.white += move.white;
                    existingMove.black += move.black;
                    existingMove.draws += move.draws;
                    for (const g of move.games) {
                        existingMove.games.add(g);
                    }
                }
            }
            existingPosition.moves.sort(
                (lhs, rhs) =>
                    rhs.white + rhs.black + rhs.draws - (lhs.white + lhs.black + lhs.draws),
            );
        }
    }

    /**
     * Indexes a game into the opening tree. Games with only
     * a single move are skipped.
     * @param game The data of the game.
     * @param pgn The pgn of the game.
     * @returns True if the game was successfully indexed.
     */
    indexGame(game: GameData, pgn: string): boolean {
        try {
            const chess = new Chess({ pgn });
            if (chess.plyCount() < MIN_PLY_COUNT) {
                return false;
            }

            game.plyCount = chess.plyCount();
            game.headers = chess.header().valueMap();
            this.setGame(game);

            const resultKey =
                game.result === '1-0' ? 'white' : game.result === '0-1' ? 'black' : 'draws';
            let position: PositionData = {
                white: 0,
                black: 0,
                draws: 0,
                [resultKey]: 1,
                games: new Set([game.url]),
                moves: [
                    {
                        san: chess.firstMove()?.san || '',
                        white: 0,
                        black: 0,
                        draws: 0,
                        [resultKey]: 1,
                        games: new Set([game.url]),
                    },
                ],
            };
            this.mergePosition(chess.setUpFen(), position);

            for (const move of chess.history()) {
                const nextMove = chess.nextMove(move);

                position = {
                    ...position,
                    games: new Set([game.url]),
                    moves: nextMove
                        ? [
                              {
                                  san: nextMove.san,
                                  white: 0,
                                  black: 0,
                                  draws: 0,
                                  [resultKey]: 1,
                                  games: new Set([game.url]),
                              },
                          ]
                        : [],
                };
                this.mergePosition(move.fen, position);
            }
            return true;
        } catch (err) {
            logger.error?.(`Failed to index game`, game, err);
            return false;
        }
    }
}

/**
 * Returns true if the given game matches the given filters.
 * @param game The game to check. If undefined, false is returned.
 * @param filter The filters to check. If undefined and game is defined, true is returned.
 */
function matchesFilter(game: GameData | undefined, filter: GameFilters | undefined): boolean {
    if (!game) {
        return false;
    }
    if (!filter) {
        return true;
    }
    for (const source of filter.hiddenSources) {
        if (source.type === game.source.type && source.username === game.source.username) {
            return false;
        }
    }
    if (filter.color !== Color.Both && game.playerColor !== filter.color) {
        return false;
    }
    if (
        !filter.win &&
        ((game.result === GameResult.White && game.playerColor === Color.White) ||
            (game.result === GameResult.Black && game.playerColor === Color.Black))
    ) {
        return false;
    }
    if (!filter.draw && game.result === GameResult.Draw) {
        return false;
    }
    if (
        !filter.loss &&
        ((game.result === GameResult.White && game.playerColor === Color.Black) ||
            (game.result === GameResult.Black && game.playerColor === Color.White))
    ) {
        return false;
    }
    if (!filter.casual && !game.rated) {
        return false;
    }
    if (!filter.rated && game.rated) {
        return false;
    }
    if (filter.dateRange[0] && filter.dateRange[0] > game.headers.Date) {
        return false;
    }
    if (filter.dateRange[1] && filter.dateRange[1] < game.headers.Date) {
        return false;
    }
    const opponentRating = game.playerColor === Color.White ? game.blackElo : game.whiteElo;
    if (filter.opponentRating[0] > opponentRating || filter.opponentRating[1] < opponentRating) {
        return false;
    }
    if (!filter.bullet && game.timeClass === OnlineGameTimeClass.Bullet) {
        return false;
    }
    if (!filter.blitz && game.timeClass === OnlineGameTimeClass.Blitz) {
        return false;
    }
    if (!filter.rapid && game.timeClass === OnlineGameTimeClass.Rapid) {
        return false;
    }
    if (!filter.classical && game.timeClass === OnlineGameTimeClass.Classical) {
        return false;
    }
    if (!filter.daily && game.timeClass === OnlineGameTimeClass.Daily) {
        return false;
    }
    if (
        filter.plyCount[0] > game.plyCount ||
        (filter.plyCount[1] !== MAX_PLY_COUNT && filter.plyCount[1] < game.plyCount)
    ) {
        return false;
    }
    return true;
}
