import { BackendIndexedGame, BuildPlayerOpeningTreeResponse } from '@/api/explorerApi';
import { OnlineGameTimeClass } from '@/api/external/onlineGame';
import {
    GameData,
    LichessExplorerMove,
    LichessExplorerPosition,
    PerformanceData,
} from '@/database/explorer';
import { GameResult } from '@/database/game';
import { getNormalizedRating } from '@/database/user';
import { normalizeFen } from '@jackstenglein/chess';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/user';
import { fideDpTable } from '@jackstenglein/chess-dojo-common/src/ratings/performanceRating';
import deepEqual from 'deep-equal';
import {
    Color,
    GameFilters,
    MAX_DOWNLOAD_LIMIT,
    MAX_PLY_COUNT,
    PlayerSource,
    SourceType,
} from './PlayerSource';

interface StatsResult {
    white: number;
    black: number;
    draws: number;
    performanceData?: PerformanceData;
}

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

    /** Cache for getPosition results, keyed by normalized FEN. */
    private positionCache = new Map<string, PositionData>();
    /** Cache for getGames results, keyed by normalized FEN. */
    private gamesCache = new Map<string, GameData[]>();

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
     * Constructs an OpeningTree from the backend API response.
     */
    static fromBackendResponse(resp: BuildPlayerOpeningTreeResponse): OpeningTree {
        const gameData = new Map<string, GameData>();
        for (const [url, bg] of Object.entries(resp.games)) {
            gameData.set(url, convertBackendGame(bg));
        }

        const positionData = new Map<string, PositionData>();
        for (const [fen, bp] of Object.entries(resp.positions)) {
            positionData.set(normalizeFen(fen), {
                white: bp.white,
                black: bp.black,
                draws: bp.draws,
                games: new Set(bp.games ?? []),
                moves: (bp.moves ?? []).map((m) => ({
                    san: m.san,
                    white: m.white,
                    black: m.black,
                    draws: m.draws,
                    games: new Set(m.games ?? []),
                })),
            });
        }

        return new OpeningTree(positionData, gameData);
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
        this.invalidateCaches();
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

    /** Invalidates the position and games caches. */
    private invalidateCaches() {
        this.positionCache.clear();
        this.gamesCache.clear();
    }

    /** Adds the given game to the game data map. */
    setGame(game: GameData) {
        this.gameData.set(game.url, game);
        this.invalidateCaches();
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

        const cached = this.gamesCache.get(fen);
        if (cached) {
            return cached;
        }

        const result = [];
        for (const url of position.games) {
            const game = this.getGame(url);
            if (game && this.matchesCurrentFilters(url, game)) {
                result.push(game);
            }
        }
        const sorted = result.sort((lhs, rhs) =>
            (rhs.headers.Date ?? '').localeCompare(lhs.headers.Date ?? ''),
        );
        this.gamesCache.set(fen, sorted);
        return sorted;
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
        this.invalidateCaches();
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

        const cached = this.positionCache.get(fen);
        if (cached) {
            return cached;
        }

        const positionStats = this.calculateStats(position.games);

        const moves = position.moves
            .map((move) => {
                const moveStats = this.calculateStats(move.games);
                return { ...move, ...moveStats };
            })
            .filter((m) => m.white || m.black || m.draws)
            .sort(
                (lhs, rhs) =>
                    rhs.white + rhs.black + rhs.draws - (lhs.white + lhs.black + lhs.draws),
            );

        const result = { ...position, ...positionStats, moves };

        this.positionCache.set(fen, result);
        return result;
    }

    /**
     * Returns whether a game URL passes the current filters,
     * using the precomputed mostRecentGames set when available.
     * @param url The game URL to check.
     * @param game The game data (must not be undefined).
     */
    private matchesCurrentFilters(url: string, game: GameData): boolean {
        if (this.mostRecentGames) {
            return this.mostRecentGames.has(url);
        }
        return matchesFilter(game, this.filters);
    }

    /**
     * Calculates W/D/L stats and performance data for a set of game URLs,
     * applying the current filters.
     * @param gameUrls The set of game URLs to calculate stats for.
     * @returns The calculated stats including white, black, draws, and optional performanceData.
     */
    private calculateStats(gameUrls: Set<string>): StatsResult {
        let white = 0;
        let black = 0;
        let draws = 0;
        let playerWins = 0;
        let totalOpponentRating = 0;

        let lastPlayed: GameData | undefined = undefined;
        let bestWin: GameData | undefined = undefined;
        let worstLoss: GameData | undefined = undefined;

        for (const url of gameUrls) {
            const game = this.getGame(url);
            if (!game || !this.matchesCurrentFilters(url, game)) {
                continue;
            }

            if (game.headers.Date > (lastPlayed?.headers.Date ?? '')) {
                lastPlayed = game;
            }

            const opponentRating = getOpponentRating(game);
            const isPlayerWin =
                (game.result === GameResult.White && game.playerColor === Color.White) ||
                (game.result === GameResult.Black && game.playerColor === Color.Black);
            const isPlayerLoss =
                (game.result === GameResult.White && game.playerColor === Color.Black) ||
                (game.result === GameResult.Black && game.playerColor === Color.White);

            if (game.result === GameResult.White) {
                white++;
            } else if (game.result === GameResult.Black) {
                black++;
            } else {
                draws++;
            }

            if (isPlayerWin) {
                playerWins++;
                if (opponentRating > (bestWin ? getOpponentRating(bestWin) : 0)) {
                    bestWin = game;
                }
            } else if (isPlayerLoss) {
                if (opponentRating < (worstLoss ? getOpponentRating(worstLoss) : Infinity)) {
                    worstLoss = game;
                }
            }

            totalOpponentRating += opponentRating;
        }

        const result: StatsResult = { white, black, draws };
        const totalGames = white + black + draws;
        result.performanceData = buildPerformanceData(
            totalGames,
            playerWins,
            draws,
            totalOpponentRating,
            lastPlayed,
            bestWin,
            worstLoss,
        );

        return result;
    }

    /**
     * Merges another OpeningTree into this one additively. Positions keyed by FEN
     * have their W/B/D counts summed, game sets unioned, and move lists merged
     * (same SAN = sum counts + union games, new SAN = append). Game data maps are
     * unioned (URL-keyed). Cached/filtered results are cleared.
     * @param other The OpeningTree to merge into this one.
     */
    merge(other: OpeningTree) {
        for (const [url, game] of other.gameData) {
            if (!this.gameData.has(url)) {
                this.gameData.set(url, game);
            }
        }

        for (const [fen, position] of other.positionData) {
            this.mergePosition(fen, position);
        }

        this.gamesSortedByDate = undefined;
        this.filters = undefined;
        this.mostRecentGames = undefined;
        this.invalidateCaches();
    }

    /**
     * Merges the given position data with the existing position data for the FEN.
     * @param fen The un-normalized FEN of the position.
     * @param position The data to merge into the existing data.
     */
    mergePosition(fen: string, position: PositionData) {
        fen = normalizeFen(fen);
        this.invalidateCaches();
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
}

const BACKEND_TIME_CLASS_MAP: Record<string, OnlineGameTimeClass> = {
    bullet: OnlineGameTimeClass.Bullet,
    blitz: OnlineGameTimeClass.Blitz,
    rapid: OnlineGameTimeClass.Rapid,
    classical: OnlineGameTimeClass.Classical,
    correspondence: OnlineGameTimeClass.Daily,
};

function convertBackendGame(bg: BackendIndexedGame): GameData {
    const sourceType = bg.source.type === 'lichess' ? SourceType.Lichess : SourceType.Chesscom;
    const playerColor = bg.playerColor === 'black' ? Color.Black : Color.White;
    const ratingSystem =
        sourceType === SourceType.Lichess ? RatingSystem.Lichess : RatingSystem.Chesscom;
    const source: PlayerSource = {
        type: sourceType,
        username: playerColor === Color.White ? bg.white : bg.black,
    };

    return {
        source,
        playerColor,
        white: bg.white,
        black: bg.black,
        whiteElo: bg.whiteElo,
        normalizedWhiteElo: getNormalizedRating(bg.whiteElo, ratingSystem),
        blackElo: bg.blackElo,
        normalizedBlackElo: getNormalizedRating(bg.blackElo, ratingSystem),
        result: bg.result as GameResult,
        plyCount: bg.plyCount,
        rated: bg.rated,
        url: bg.url,
        headers: bg.headers ?? {},
        timeClass: BACKEND_TIME_CLASS_MAP[bg.timeClass] ?? OnlineGameTimeClass.Rapid,
    };
}

/**
 * Returns the opponent's normalized rating for a game, based on the player's color.
 * @param game The game to get the opponent rating from.
 */
function getOpponentRating(game: GameData): number {
    return game.playerColor === Color.White ? game.normalizedBlackElo : game.normalizedWhiteElo;
}

/**
 * Builds performance data from accumulated stats, or returns undefined if no games.
 */
function buildPerformanceData(
    totalGames: number,
    playerWins: number,
    draws: number,
    totalOpponentRating: number,
    lastPlayed: GameData | undefined,
    bestWin: GameData | undefined,
    worstLoss: GameData | undefined,
): PerformanceData | undefined {
    if (!lastPlayed || totalGames <= 0) {
        return undefined;
    }

    const score = playerWins + draws / 2;
    const percentage = (score / totalGames) * 100;
    const ratingDiff = fideDpTable[Math.round(percentage)];
    const averageOpponentRating = Math.round(totalOpponentRating / totalGames);
    const performanceRating = averageOpponentRating + ratingDiff;

    return {
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
