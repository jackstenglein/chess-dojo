'use server';

import { CandidateMove, Chess } from '@jackstenglein/chess';
import {
    LichessFetcher,
    PgnImportError,
    PgnImportResult,
} from '@jackstenglein/chess-dojo-common/src/lichess/lichess';
import tcn from '@savi2w/chess-tcn';
import axios from 'axios';
import { Browser, BrowserErrorCaptureEnum } from 'happy-dom';
import moment from 'moment';

export type { PgnImportError, PgnImportResult };

const chesscomGameRegexes = [
    new RegExp('/game/(live|daily)/(\\d+)'),
    new RegExp('/(live|daily)/game/(\\d+)'),
];
const chesscomEventRegex = new RegExp('/events/(.*)');

const lichessFetcher = new LichessFetcher(process.env.LICHESS_API_TOKEN);

interface GetChesscomByIdResponse {
    game?: {
        moveTimestamps?: string;
        moveList?: string;
        pgnHeaders?: Record<string, string | number>;
    };
}

interface ChesscomEventResponse {
    game?: {
        result?: '0-1' | '1-0' | '1/2-1/2';
        white?: {
            preferredName?: string;
            elo?: number;
            fideId?: number;
        };
        black?: {
            preferredName?: string;
            elo?: number;
            fideId?: number;
        };
    };
    moves?: [
        {
            /** The move in the format LAN_SAN. */
            cbn?: string;
            /** The number of milliseconds left on the clock after the move is played. */
            clock?: number;
        },
    ];
}

/**
 * Fetches the PGN of the given Lichess game.
 * @param url The URL of the Lichess game.
 * @returns The PGN of the Lichess game.
 */
export async function getLichessGame(url?: string) {
    return lichessFetcher.getLichessGame(url);
}

/**
 * Fetches the PGN of the given Lichess study chapter.
 * @param url The URL of the Lichess study chapter.
 * @returns The PGN of the chapter.
 */
export async function getLichessChapter(url?: string) {
    return lichessFetcher.getLichessChapter(url);
}

/**
 * Fetches a list of the PGNs in the given Lichess study.
 * @param url The URL of the Lichess study.
 * @returns A list of the PGNs in the study.
 */
export async function getLichessStudy(url?: string): Promise<PgnImportResult<string[]>> {
    return lichessFetcher.getLichessStudy(url);
}

/**
 * Converts the given epoch milliseconds to the H:mm:ss format.
 * @param ms The epoch time in milliseconds.
 * @returns The given time converted to H:mm:ss format.
 */
function msToClk(ms: number) {
    return moment.utc(ms).format('H:mm:ss');
}

/**
 * Extracts the PGN from a Chess.com saved analysis.
 * @param url The URL of the analysis.
 * @returns The PGN of the analysis.
 */
export async function getChesscomAnalysis(url?: string): Promise<PgnImportResult<string>> {
    if (!url) {
        return {
            error: {
                statusCode: 400,
                publicMessage:
                    'Invalid request: url is required when importing a chess.com saved analysis.',
            },
        };
    }

    const browser = new Browser({
        settings: {
            disableJavaScriptFileLoading: true,
            disableCSSFileLoading: true,
            disableIframePageLoading: true,
            disableComputedStyleRendering: true,
            errorCapture: BrowserErrorCaptureEnum.processLevel,
        },
    });

    const page = browser.newPage();
    await page.goto(url);
    await page.waitUntilComplete();

    const data: unknown = page.mainFrame.window.eval('window.chesscom');
    if (typeof data !== 'object' || !data) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'This Chess.com analysis page may not yet be supported.',
                privateMessage: 'window.chesscom was undefined or not an object',
            },
        };
    }

    if (!('analysis' in data)) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'This Chess.com analysis page may not yet be supported.',
                privateMessage: 'window.chesscom did not contain an analysis field',
            },
        };
    }

    const analysis = data.analysis;
    if (typeof analysis !== 'object' || !analysis || !('pgn' in analysis)) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'This Chess.com analysis page may not yet be supported.',
                privateMessage: 'window.chesscom.analysis did not contain a pgn filed',
            },
        };
    }

    const pgnText = analysis.pgn;
    if (typeof pgnText !== 'string') {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'This Chess.com analysis page may not yet be supported.',
                privateMessage: 'window.chesscom.analysis.pgn was not a string',
            },
        };
    }

    return { data: pgnText };
}

/**
 * Extracts the PGN from a Chess.com game.
 * @param gameURL The URL of the game.
 * @returns The PGN of the game.
 */
export async function getChesscomGame(gameURL?: string): Promise<PgnImportResult<string>> {
    let gameType: string | undefined = undefined;
    let gameId: string | undefined = undefined;

    for (const regex of chesscomGameRegexes) {
        [, gameType, gameId] = (gameURL ?? '').match(regex) ?? [];
        if (gameType && gameId) {
            break;
        }
    }

    if (!gameType || !gameId) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'Not a valid chess.com live or daily game URL',
            },
        };
    }

    const resp = await axios.get<GetChesscomByIdResponse>(
        `https://www.chess.com/callback/${gameType}/game/${gameId}`,
    );
    const gameData = resp.data.game;

    // Unstable endpoint not part of the official API
    if (gameData?.moveList === undefined || gameData?.pgnHeaders === undefined) {
        return {
            error: {
                statusCode: 500,
                publicMessage: 'Chess.com API changed',
            },
        };
    }

    if (gameData.moveList.length % 2 !== 0) {
        return {
            error: {
                statusCode: 500,
                publicMessage: 'Chess.com API changed; unexpected moveList format',
            },
        };
    }

    const encodedMoves = [];
    for (let i = 0; i < gameData.moveList.length; i += 2) {
        encodedMoves.push(gameData.moveList.slice(i, i + 2));
    }

    const startingPosition = gameData.pgnHeaders.FEN?.toString();
    const game = new Chess({ fen: startingPosition });

    for (const [key, value] of Object.entries(gameData.pgnHeaders)) {
        game.setHeader(key, value.toString());
    }

    // Timestamps are in deci-seconds -- convert to milliseconds
    const moveTimestamps = gameData.moveTimestamps?.split(',').map((n) => Number(n) * 100) ?? [];

    for (let i = 0; i < encodedMoves.length; i++) {
        const encodedMove = encodedMoves[i];
        const move = tcn.decode(encodedMove);
        const gameMove = game.move(move as CandidateMove);
        if (!gameMove) {
            // Chess.com for some reason notates castling in daily games with
            // the king moving to the rook's square, which causes the move function
            // to fail.
            const king = game.pieces('k', game.turn())[0];
            if (king?.square === move.from) {
                if (move.from === 'e8' && move.to === 'h8') {
                    game.move({ from: 'e8', to: 'g8' });
                }
                if (move.from === 'e8' && move.to === 'a8') {
                    game.move({ from: 'e8', to: 'c8' });
                }
                if (move.from === 'e1' && move.to === 'h1') {
                    game.move({ from: 'e1', to: 'g1' });
                }
                if (move.from === 'e1' && move.to === 'a1') {
                    game.move({ from: 'e1', to: 'c1' });
                }
            }
        }

        if (i < moveTimestamps.length) {
            const timestamp = moveTimestamps[i];
            const clk = msToClk(timestamp);
            game.setComment(`[%clk ${clk}]`);
        }
    }

    return { data: game.pgn.render() };
}

/**
 * Extracts the PGN from a Chess.com events URL.
 * @param url The URL to extract the PGN from.
 * @returns The PGN of the game.
 */
export async function getChesscomEvent(url?: string): Promise<PgnImportResult<string>> {
    const [, path] = chesscomEventRegex.exec(url ?? '') ?? [];

    if (!path) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'Not a valid chess.com event URL.',
            },
        };
    }

    const resp = await axios.post<ChesscomEventResponse>(
        `https://www.chess.com/events/v1/api/game/${path}`,
    );

    const game = resp.data.game;
    const moves = resp.data.moves;
    if (!game?.white || !game.black || !moves) {
        return {
            error: {
                statusCode: 500,
                publicMessage: 'Chess.com API changed',
            },
        };
    }

    const chess = new Chess();
    for (const move of moves) {
        const san = move.cbn?.split('_')?.[1];
        if (!san) {
            return {
                error: {
                    statusCode: 500,
                    publicMessage: 'Chess.com API changed',
                },
            };
        }

        chess.move(san);
        if (move.clock) {
            const clk = msToClk(move.clock);
            chess.setCommand('clk', clk);
        }
    }

    if (game.result) {
        chess.setHeader('Result', game.result);
    }

    for (const [color, obj] of [
        ['White', game.white],
        ['Black', game.black],
    ] as const) {
        if (obj.preferredName) {
            chess.setHeader(color, obj.preferredName);
        }
        if (obj.elo) {
            chess.setHeader(`${color}Elo`, `${obj.elo}`);
        }
        if (obj.fideId) {
            chess.setHeader(`${color}FideId`, `${obj.fideId}`);
        }
    }

    return { data: chess.renderPgn() };
}
