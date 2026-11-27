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

/** A packed list of indexes into an opening tree's game array. */
export interface PackedGameIds {
    ids: Uint32Array;
    /** The number of ids in use. The buffer may be longer. */
    count: number;
}

/** Returns a packed list containing the given game indexes. */
export function packGameIds(ids: ArrayLike<number> = []): PackedGameIds {
    return { ids: Uint32Array.from(ids), count: ids.length };
}

interface PositionDataMove extends LichessExplorerMove {
    /** Indexes of the games that played this move. */
    games: PackedGameIds;
}

export interface PositionData extends LichessExplorerPosition {
    /** The moves played from this position, ordered from most common to least common. */
    moves: PositionDataMove[];
    /**
     * Indexes of games that ended in this position. Games that continued are stored on the
     * move they played.
     */
    terminalGames: PackedGameIds;
}

const fenHasher = new Chess();

/**
 * Returns the Zobrist hash of the normalized position. Halfmove and fullmove clocks are ignored.
 * @param fen The FEN to hash.
 */
function positionHash(fen: string): bigint {
    fenHasher.chessjs.load(normalizeFen(fen), { skipValidation: true });
    return BigInt(`0x${fenHasher.chessjs.hash()}`);
}

function appendGameIds(packed: PackedGameIds, extra: PackedGameIds): PackedGameIds {
    if (extra.count === 0) {
        return packed;
    }
    const count = packed.count + extra.count;
    if (count <= packed.ids.length) {
        packed.ids.set(extra.ids.subarray(0, extra.count), packed.count);
        packed.count = count;
        return packed;
    }

    const ids = new Uint32Array(Math.max(packed.ids.length * 2, count));
    ids.set(packed.ids.subarray(0, packed.count));
    ids.set(extra.ids.subarray(0, extra.count), packed.count);
    return { ids, count };
}

export class OpeningTree {
    /** A map from the Zobrist hash of a position to its data. */
    private positionData: Map<bigint, PositionData>;
    /** Games indexed by this tree, addressed by their array index. */
    private gameData: GameData[];
    /** A map from a game URL to its index in gameData. */
    private gameIds: Map<string, number>;

    /** The last applied filters when mostRecentGames was calculated. */
    private filters: GameFilters | undefined;
    /** Indexes of all games, sorted by date. */
    private gamesSortedByDate: number[] | undefined;
    /** Indexes of the most recent games matching the filters. */
    private mostRecentGames: Set<number> | undefined;

    constructor(positionData?: Map<bigint, PositionData>, gameData?: GameData[]) {
        this.positionData = new Map(positionData);
        this.gameData = gameData ? gameData.slice() : [];
        this.gameIds = new Map(this.gameData.map((game, id) => [game.url, id]));
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
        if (this.gamesSortedByDate?.length !== this.gameData.length) {
            this.gamesSortedByDate = this.gameData
                .map((game, id) => ({ game, id }))
                .sort((lhs, rhs) =>
                    (rhs.game.headers.Date ?? '').localeCompare(lhs.game.headers.Date ?? ''),
                )
                .map((entry) => entry.id);
        }

        const matchingGames = this.gamesSortedByDate.filter((id) =>
            matchesFilter(this.gameData[id], this.filters),
        );
        this.mostRecentGames = new Set(matchingGames.slice(0, this.filters?.downloadLimit));
    }

    /**
     * Adds the given game and returns its index. A game URL that is already present keeps its
     * index and replaces the stored record.
     * @param game The game to add.
     */
    setGame(game: GameData): number {
        const existing = this.gameIds.get(game.url);
        if (existing !== undefined) {
            this.gameData[existing] = game;
            return existing;
        }

        const id = this.gameData.length;
        this.gameData.push(game);
        this.gameIds.set(game.url, id);
        return id;
    }

    /**
     * Returns the game with the given URL.
     * @param url The URL of the game to get.
     */
    getGame(url: string): GameData | undefined {
        const id = this.gameIds.get(url);
        return id === undefined ? undefined : this.gameData[id];
    }

    /**
     * Returns a list of games matching the given FEN and filters.
     * @param fen The un-normalized FEN to fetch games for.
     * @param filters The filters to apply to the games.
     */
    getGames(fen: string, filters: GameFilters): GameData[] {
        const position = this.positionData.get(positionHash(fen));
        if (!position) {
            return [];
        }

        this.setFiltersIfNecessary(filters);
        const result = [];
        for (const id of this.positionGameIds(position)) {
            const game = this.gameData[id];
            if (
                game &&
                (this.mostRecentGames?.has(id) ||
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
        return this.gameData.length;
    }

    /**
     * Sets the position data for the given FEN.
     * @param fen The un-normalized FEN to set the data for.
     * @param position The position to set.
     */
    setPosition(fen: string, position: PositionData) {
        this.positionData.set(positionHash(fen), position);
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
        const position = this.positionData.get(positionHash(fen));
        if (!position) {
            return position;
        }

        this.setFiltersIfNecessary(filters);

        const counted = this.countGames(this.positionGameIds(position));
        const { white, black, draws, lastPlayed } = counted;

        const moves = position.moves
            .map((move) => {
                const countedMove = this.countGames(this.gameIdsIn(move.games));
                const white = countedMove.white;
                const black = countedMove.black;
                const draws = countedMove.draws;
                const playerWins = countedMove.playerWins;
                const totalOpponentRating = countedMove.totalOpponentRating;
                const lastPlayed = countedMove.lastPlayed;
                const bestWin = countedMove.bestWin;
                const worstLoss = countedMove.worstLoss;
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
            const score = counted.playerWins + draws / 2;
            const percentage = (score / totalGames) * 100;
            const ratingDiff = fideDpTable[Math.round(percentage)];
            const averageOpponentRating = Math.round(counted.totalOpponentRating / totalGames);
            const performanceRating = averageOpponentRating + ratingDiff;

            result.performanceData = {
                playerWins: counted.playerWins,
                playerDraws: draws,
                playerLosses: totalGames - counted.playerWins - draws,
                performanceRating,
                averageOpponentRating,
                lastPlayed,
                bestWin: counted.bestWin,
                worstLoss: counted.worstLoss,
            };
        }

        return result;
    }

    /** Yields the index of every game that reached the position. */
    private *positionGameIds(position: PositionData): Iterable<number> {
        for (const move of position.moves) {
            yield* this.gameIdsIn(move.games);
        }
        yield* this.gameIdsIn(position.terminalGames);
    }

    /** Yields the indexes stored in a packed list. */
    private *gameIdsIn(games: PackedGameIds): Iterable<number> {
        for (let i = 0; i < games.count; i++) {
            yield games.ids[i];
        }
    }

    /**
     * Counts the filtered games in the given indexes.
     * @param ids The game indexes to count.
     */
    private countGames(ids: Iterable<number>) {
        let white = 0;
        let black = 0;
        let draws = 0;
        let playerWins = 0;
        let totalOpponentRating = 0;

        let lastPlayed: GameData | undefined = undefined;
        let bestWin: GameData | undefined = undefined;
        let worstLoss: GameData | undefined = undefined;

        for (const id of ids) {
            const game = this.gameData[id];
            if (
                !game ||
                (!this.mostRecentGames?.has(id) &&
                    (this.mostRecentGames || !matchesFilter(game, this.filters)))
            ) {
                continue;
            }

            if (game.headers.Date > (lastPlayed?.headers.Date ?? '')) {
                lastPlayed = game;
            }

            const opponentRating =
                game.playerColor === Color.White
                    ? game.normalizedBlackElo
                    : game.normalizedWhiteElo;

            if (game.result === GameResult.White) {
                white++;
                if (game.playerColor === Color.White) {
                    playerWins++;
                    const bestWinOpponentRating = bestWin
                        ? bestWin.playerColor === Color.White
                            ? bestWin.normalizedBlackElo
                            : bestWin.normalizedWhiteElo
                        : 0;
                    if (opponentRating > bestWinOpponentRating) {
                        bestWin = game;
                    }
                } else {
                    const worstLossOpponentRating = worstLoss
                        ? worstLoss.playerColor === Color.White
                            ? worstLoss.normalizedBlackElo
                            : worstLoss.normalizedWhiteElo
                        : Infinity;
                    if (opponentRating < worstLossOpponentRating) {
                        worstLoss = game;
                    }
                }
            } else if (game.result === GameResult.Black) {
                black++;
                if (game.playerColor === Color.Black) {
                    playerWins++;
                    const bestWinOpponentRating = bestWin
                        ? bestWin.playerColor === Color.White
                            ? bestWin.normalizedBlackElo
                            : bestWin.normalizedWhiteElo
                        : 0;
                    if (opponentRating > bestWinOpponentRating) {
                        bestWin = game;
                    }
                } else {
                    const worstLossOpponentRating = worstLoss
                        ? worstLoss.playerColor === Color.White
                            ? worstLoss.normalizedBlackElo
                            : worstLoss.normalizedWhiteElo
                        : Infinity;
                    if (opponentRating < worstLossOpponentRating) {
                        worstLoss = game;
                    }
                }
            } else {
                draws++;
            }

            totalOpponentRating += opponentRating;
        }

        return {
            white,
            black,
            draws,
            playerWins,
            totalOpponentRating,
            lastPlayed,
            bestWin,
            worstLoss,
        };
    }

    /**
     * Merges the given position data with the existing position data for the FEN.
     * @param fen The un-normalized FEN of the position.
     * @param position The data to merge into the existing data.
     */
    mergePosition(fen: string, position: PositionData) {
        const key = positionHash(fen);
        const existingPosition = this.positionData.get(key);
        if (!existingPosition) {
            this.positionData.set(key, position);
            return;
        }

        existingPosition.white += position.white;
        existingPosition.black += position.black;
        existingPosition.draws += position.draws;
        existingPosition.terminalGames = appendGameIds(
            existingPosition.terminalGames,
            position.terminalGames,
        );

        for (const move of position.moves) {
            const existingMove = existingPosition.moves.find((m) => m.san === move.san);
            if (!existingMove) {
                existingPosition.moves.push(move);
            } else {
                existingMove.white += move.white;
                existingMove.black += move.black;
                existingMove.draws += move.draws;
                existingMove.games = appendGameIds(existingMove.games, move.games);
            }
        }
        existingPosition.moves.sort(
            (lhs, rhs) => rhs.white + rhs.black + rhs.draws - (lhs.white + lhs.black + lhs.draws),
        );
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
            const gameId = this.setGame(game);
            const resultKey =
                game.result === '1-0' ? 'white' : game.result === '0-1' ? 'black' : 'draws';

            const counts = (): Pick<PositionData, 'white' | 'black' | 'draws'> => ({
                white: 0,
                black: 0,
                draws: 0,
                [resultKey]: 1,
            });
            const played = (san: string): PositionDataMove => ({
                san,
                ...counts(),
                games: packGameIds([gameId]),
            });

            this.mergePosition(chess.setUpFen(), {
                ...counts(),
                terminalGames: packGameIds(),
                moves: [{ ...played(chess.firstMove()?.san || '') }],
            });

            for (const move of chess.history()) {
                const nextMove = chess.nextMove(move);
                this.mergePosition(move.fen, {
                    ...counts(),
                    terminalGames: nextMove ? packGameIds() : packGameIds([gameId]),
                    moves: nextMove ? [played(nextMove.san)] : [],
                });
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
