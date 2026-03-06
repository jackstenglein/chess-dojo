import { axiosService } from '@/api/axiosService';
import { ChesscomGame, fetchChesscomArchiveGames } from '@/api/external/chesscom';
import { LichessGame } from '@/api/external/lichess';
import { chesscomGameResult, getTimeClass, lichessGameResult } from '@/api/external/onlineGame';
import { GameData } from '@/database/explorer';
import { getNormalizedRating } from '@/database/user';
import { logger } from '@/logging/logger';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Mutex } from 'async-mutex';
import { expose, proxy } from 'comlink';
import { OpeningTree } from './OpeningTree';
import {
    Color,
    MAX_DOWNLOAD_LIMIT,
    MIN_DOWNLOAD_LIMIT,
    PlayerSource,
    SourceType,
} from './PlayerSource';

interface ChesscomListArchivesResponse {
    /**
     * A list of URLs in the form https://api.chess.com/pub/player/{username}/{year}/{month}
     * sorted in ascending order. Months are 1-indexed.
     */
    archives: string[];
}

const CHESSCOM_ARCHIVE_REGEX = /^https:\/\/api.chess.com\/pub\/player\/.*\/(\d{4})\/(\d{2})$/;

/** Creates an OpeningTreeLoader. */
export interface OpeningTreeLoaderFactory {
    /** Returns a new OpeningTreeLoader. */
    newLoader: () => OpeningTreeLoader;
}

/**
 * OpeningTreeLoader handles the loading of Chess.com and Lichess player opening trees.
 * It is intended to be run in a Web Worker to avoid clogging the main UI thread.
 */
export class OpeningTreeLoader {
    private openingTree: OpeningTree | undefined;
    private mutex = new Mutex();
    private incrementIndexedCount: ((inc?: number) => void) | undefined;
    private updateProgress: ((tree: OpeningTree) => void) | undefined;
    private abortController: AbortController | undefined;
    private downloadLimit: number | undefined;

    /**
     * Loads the opening tree for the given sources.
     * @param sources The sources to load.
     * @param incrementIndexedCount A callback function invoked to increment the count of indexed games.
     * @param updateProgress A callback function invoked with the partial tree while still downloading.
     * @returns The final opening tree with all sources merged.
     */
    async load(
        sources: PlayerSource[],
        incrementIndexedCount: (inc?: number) => void,
        updateProgress: (tree: OpeningTree) => void,
        downloadLimit?: number,
    ) {
        this.abortController = new AbortController();
        this.incrementIndexedCount = incrementIndexedCount;
        this.updateProgress = updateProgress;
        this.downloadLimit =
            downloadLimit && downloadLimit < MAX_DOWNLOAD_LIMIT ? downloadLimit : undefined;

        this.openingTree = new OpeningTree();
        const chesscomSources: PlayerSource[] = [];
        const lichessSources: PlayerSource[] = [];

        for (const source of sources) {
            if (source.type === SourceType.Chesscom) {
                chesscomSources.push(source);
            } else {
                lichessSources.push(source);
            }
        }

        const promises = [this.loadChesscom(chesscomSources), this.loadLichess(lichessSources)];
        await Promise.allSettled(promises);
        return this.openingTree;
    }

    /** Aborts any in-flight fetch requests. */
    abort() {
        this.abortController?.abort();
    }

    /**
     * Loads the given Chess.com sources.
     * @param sources The sources to load.
     */
    private async loadChesscom(sources: PlayerSource[]) {
        for (const source of sources) {
            try {
                await this.loadChesscomSource({
                    ...source,
                    username: source.username.trim().toLowerCase(),
                });
            } catch (err) {
                logger.error?.('Failed to load Chess.com source: ', source, err);
            }
        }
    }

    /**
     * Loads a single Chess.com source.
     * @param source The source to load.
     */
    private async loadChesscomSource(source: PlayerSource) {
        if (source.type !== SourceType.Chesscom) {
            throw new Error(`Invalid source type: ${source.type}`);
        }

        const archiveResponse = await axiosService.get<ChesscomListArchivesResponse>(
            `https://api.chess.com/pub/player/${source.username}/games/archives`,
            { signal: this.abortController?.signal },
        );
        const archives = archiveResponse.data.archives?.toReversed() ?? [];

        for (const archive of archives) {
            if (this.isDownloadLimitReached()) {
                break;
            }

            try {
                const match = CHESSCOM_ARCHIVE_REGEX.exec(archive);
                if (!match) {
                    logger.warn?.(
                        `Skipping archive ${archive} because it does not match archive regex ${CHESSCOM_ARCHIVE_REGEX.source}`,
                    );
                    continue;
                }
                const year = match[1];
                const month = match[2];

                const games = await fetchChesscomArchiveGames(
                    source.username,
                    year,
                    month,
                    this.abortController?.signal,
                );
                const promises = games.map((game) => this.indexChesscomGame(source, game));
                await Promise.allSettled(promises);
            } catch (err) {
                logger.error?.(`Failed to load Chess.com archive ${archive}: `, err);
            }
        }
    }

    /**
     * Indexes a single Chess.com game into the opening tree.
     * @param source The source of the game.
     * @param game The Chess.com game data.
     * @returns A Promise that is resolved once the game has been indexed.
     */
    private indexChesscomGame(source: PlayerSource, game: ChesscomGame) {
        const gameData: GameData = {
            source,
            playerColor:
                game.white.username.toLowerCase() === source.username ? Color.White : Color.Black,
            white: game.white.username,
            black: game.black.username,
            whiteElo: game.white.rating,
            normalizedWhiteElo: getNormalizedRating(game.white.rating, RatingSystem.Chesscom),
            blackElo: game.black.rating,
            normalizedBlackElo: getNormalizedRating(game.black.rating, RatingSystem.Chesscom),
            result: chesscomGameResult(game)[0],
            plyCount: 0,
            rated: game.rated,
            url: game.url,
            headers: {},
            timeClass: getTimeClass(game.time_class, game.time_control),
        };
        return this.indexGame(gameData, game.pgn);
    }

    /**
     * Loads the given Lichess sources.
     * @param sources The sources to load.
     */
    private async loadLichess(sources: PlayerSource[]) {
        for (const source of sources) {
            try {
                await this.loadLichessSource({
                    ...source,
                    username: source.username.trim().toLowerCase(),
                });
            } catch (err) {
                logger.error?.('Failed to load Lichess source: ', source, err);
            }
        }
    }

    /**
     * Loads a single Lichess source.
     * @param source The source to load.
     */
    private async loadLichessSource(source: PlayerSource) {
        if (source.type !== SourceType.Lichess) {
            throw new Error(
                `Invalid source type ${source.type} does not equal ${SourceType.Lichess}`,
            );
        }

        const response = await fetch(
            `https://lichess.org/api/games/user/${source.username}?pgnInJson=true`,
            {
                headers: { Accept: 'application/x-ndjson' },
                signal: this.abortController?.signal,
            },
        );

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error(`No reader for lichess request`);
        }
        const decoder = new TextDecoder();

        let done = false;
        while (!done) {
            if (this.isDownloadLimitReached()) {
                await reader.cancel();
                break;
            }

            const readVal = await reader.read();
            done = readVal.done;
            if (done) {
                break;
            }

            const chunk = decoder.decode(readVal.value);
            for (let line of chunk.split('\n')) {
                line = line.trim();
                if (!line) continue;

                try {
                    const game = JSON.parse(line) as LichessGame;
                    await this.indexLichessGame(source, game);
                } catch (err) {
                    logger.error?.('Failed to load lichess game: ', line, err);
                }
            }
        }
    }

    /**
     * Indexes a single Lichess game into the opening tree.
     * @param source The source of the game.
     * @param game The Lichess game data.
     * @returns A Promise that resolves once the game has been indexed.
     */
    private indexLichessGame(source: PlayerSource, game: LichessGame) {
        const gameData: GameData = {
            source,
            playerColor:
                game.players?.white?.user?.id?.toLowerCase() === source.username
                    ? Color.White
                    : Color.Black,
            white: game.players.white.user?.id ?? '',
            black: game.players.black.user?.id ?? '',
            whiteElo: game.players.white.rating ?? 0,
            normalizedWhiteElo: getNormalizedRating(
                game.players.white.rating ?? 0,
                RatingSystem.Lichess,
            ),
            blackElo: game.players.black.rating ?? 0,
            normalizedBlackElo: getNormalizedRating(
                game.players.black.rating ?? 0,
                RatingSystem.Lichess,
            ),
            result: lichessGameResult(game)[0],
            plyCount: 0,
            rated: game.rated,
            url: `https://lichess.org/${game.id}`,
            headers: {},
            timeClass: getTimeClass(game.speed),
        };
        return this.indexGame(gameData, game.pgn);
    }

    /** Returns true if the download limit has been reached. */
    private isDownloadLimitReached(): boolean {
        return (
            this.downloadLimit !== undefined &&
            (this.openingTree?.getGameCount() ?? 0) >= this.downloadLimit
        );
    }

    /**
     * Indexes a single game into the opening tree. If necessary, the
     * indexed count and progress are updated.
     * @param game The game data.
     * @param pgn The PGN of the game.
     * @returns A Promise that resolves once the game has been indexed.
     */
    private indexGame(game: GameData, pgn: string) {
        return this.mutex.runExclusive(() => {
            if (this.openingTree?.indexGame(game, pgn)) {
                if (this.openingTree.getGameCount() % MIN_DOWNLOAD_LIMIT === 0) {
                    this.incrementIndexedCount?.(MIN_DOWNLOAD_LIMIT);
                    this.updateProgress?.(this.openingTree);
                }
            }
        });
    }
}

expose({
    newLoader: () => proxy(new OpeningTreeLoader()),
});
