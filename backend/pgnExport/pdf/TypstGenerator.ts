import { Chess, Color, Move, nullMoveNotation, Square } from '@jackstenglein/chess';
import { PdfExportRequest } from '@jackstenglein/chess-dojo-common/src/pgn/export';
import { compareNags, nags } from '@jackstenglein/chess-dojo-common/src/pgn/nag';
import qrcode from 'qrcode';
import { ApiError } from '../../directoryService/api';

const SHOW_DIAGRAM_NAG = '$1304';

interface TypstGeneratorOptions extends PdfExportRequest {
    qrcodeFilename?: string;
}

export class TypstGenerator {
    private chess: Chess;
    private result: string;
    private options: TypstGeneratorOptions;
    private startPly: number;

    constructor(options: TypstGeneratorOptions) {
        this.chess = new Chess({ pgn: options.pgn });
        this.startPly = (this.chess.firstMove()?.ply || 1) - 1;
        this.result = '';
        this.options = options;
    }

    /**
     * @returns The Typst content of the provided Game.
     */
    async toTypst(): Promise<string> {
        if (this.result) {
            return this.result;
        }

        if (this.options.cohort && this.options.id && this.options.qrcodeFilename) {
            await this.writeQrCode();
        }

        this.makeTitle();

        if (!this.options.skipComments && this.chess.pgn.gameComment.comment) {
            this.makeComment(this.chess.pgn.gameComment.comment, 0);
        }

        this.makeVariation(this.chess.history(), 0);
        this.makeResult();

        return this.result;
    }

    /**
     * Writes a QR code linking to the game to a temporary file. */
    private async writeQrCode() {
        if (!this.options.cohort || !this.options.id || !this.options.qrcodeFilename) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Temporary server error',
                privateMessage: `TypstGenerator.writeQrCode called, but options is missing cohort/id/qrcodeFilename: ${this.options}`,
            });
        }

        const cohort = encodeURIComponent(this.options.cohort);
        const id = encodeURIComponent(this.options.id);

        await new Promise<void>((resolve, reject) => {
            qrcode.toFile(
                this.options.qrcodeFilename || '',
                `https://www.chessdojo.club/games/${cohort}/${id}`,
                {
                    errorCorrectionLevel: 'H',
                },
                function (err) {
                    if (err) reject(err);
                    resolve();
                },
            );
        });
    }

    /**
     * Adds the title and beginning of the document to the output.
     */
    private makeTitle() {
        if (this.result) {
            throw new Error(`makeTitle called with existing texString ${this.result}`);
        }

        this.result = STATIC_HEADER;

        const white = getPlayer(
            this.chess.header().tags.White,
            this.chess.header().tags.WhiteElo?.value,
        );
        const black = getPlayer(
            this.chess.header().tags.Black,
            this.chess.header().tags.BlackElo?.value,
        );

        this.result += `\n#place(top + center, scope: "parent", float: true, clearance: 2em)[
            = ${escape(white)} - ${escape(black)}
            == ${this.chess.header().getRawValue('Date') || 'Unknown Date'}
            === Notes by ${this.options.orientation.slice(0, 1).toUpperCase()}${this.options.orientation.slice(1)}
        `;

        if (this.options.cohort && this.options.id && this.options.qrcodeFilename) {
            this.result += `#figure(
                image("${this.options.qrcodeFilename.replaceAll('/tmp/', '')}", width: 30%),
                caption: [View on ChessDojo.club],
                numbering: none,
                gap: 0em,
            )`;
        }
        this.result += ']';
    }

    /**
     * Begins a variation with the given depth and index.
     * @param depth The depth of the variation. 0 indicates the mainline.
     */
    private beginVariation(depth: number) {
        this.result += `\n\n`;
        if (depth > 1) {
            this.result += `#variation[`;
        }
    }

    /**
     * Resumes a variation with the given depth.
     * @param depth The depth of the variation.
     */
    private resumeVariation(depth: number) {
        if (depth) {
            return;
        }
        this.result += `#pad(top: 0.25em)[]`;
        this.beginVariation(depth);
    }

    /**
     * Ends a variation with the given depth.
     * @param depth The depth of the variation.
     */
    private endVariation(depth: number) {
        if (depth > 1) {
            this.result = this.result.trimEnd();
            this.result += `]\n\n`;
        }
    }

    /**
     * Adds the given comment to the output.
     * @param comment The comment to add.
     * @param depth The depth of the variation containing the comment.
     */
    private makeComment(comment: string, depth: number) {
        if (!depth) {
            this.result += `\n\n#par(first-line-indent: 1em)[${escape(comment).trim()}]\n\n`;
        } else {
            this.result += `\n\n#variation[\n${escape(comment).trim()}]\n\n`;
        }
    }

    /**
     * Recursively adds the given variation to the output.
     * @param moves The variation to add.
     * @param depth The depth of the variation. The mainline is 0.
     */
    private makeVariation(moves: Move[], depth: number) {
        this.beginVariation(depth);

        let forceMoveNumber = true;
        for (const move of moves) {
            if (this.options.skipNullMoves && move.san === nullMoveNotation) {
                break;
            }

            if (!this.options.skipComments && move.commentMove) {
                this.makeComment(move.commentMove, depth);
                this.resumeVariation(depth);
                forceMoveNumber = true;
            }

            this.makeMoveNumber(move, depth, forceMoveNumber);
            this.makeMoveNotation(move, depth);
            forceMoveNumber = false;

            const showDiagram =
                move.nags?.includes(SHOW_DIAGRAM_NAG) ||
                (this.options.plyBetweenDiagrams > 0 &&
                    (move.ply - this.startPly) % this.options.plyBetweenDiagrams === 0 &&
                    moves[0] !== move);

            if (
                (!this.options.skipComments && move.commentAfter) ||
                (!this.options.skipVariations && move.variations.length > 0) ||
                showDiagram
            ) {
                forceMoveNumber = true;
            }

            if (showDiagram) {
                this.makeDiagram(move, depth);
            }

            if (!this.options.skipComments && move.commentAfter) {
                this.makeComment(move.commentAfter, depth);
            }

            if (!this.options.skipVariations) {
                move.variations.forEach((variation) => this.makeVariation(variation, depth + 1));
            }

            if (forceMoveNumber) {
                this.resumeVariation(depth);
            }
        }

        this.endVariation(depth);
    }

    /**
     * Adds the number of the given move to the output if necessary. Black moves
     * are skipped unless showBlack is true.
     * @param move The move to add the number of.
     * @param depth The depth of the variation. The mainline is 0.
     * @param showBlack Whether to show the move number for black moves.
     */
    private makeMoveNumber(move: Move, depth: number, showBlack: boolean) {
        if (move.color === Color.white) {
            this.makeWhiteMoveNumber(move, depth);
        } else if (showBlack) {
            this.makeBlackMoveNumber(move, depth);
        }
    }

    /**
     * Adds the number of the given white move to the output.
     * @param move The move to add the number of.
     * @param depth The depth of the variation. The mainline is 0.
     */
    private makeWhiteMoveNumber(move: Move, depth: number) {
        const moveNumber = Math.floor(move.ply / 2) + 1;
        if (!depth) {
            this.result += `*${moveNumber}.*`;
        } else {
            this.result += `${moveNumber}.`;
        }
    }

    /**
     * Adds the number of the given black move to the output.
     * @param move The move to add the number of.
     * @param depth The depth of the variation. The mainline is 0.
     */
    private makeBlackMoveNumber(move: Move, depth: number) {
        const moveNumber = move.ply / 2;
        if (!depth) {
            this.result += `*${moveNumber}...*`;
        } else {
            this.result += `${moveNumber}...`;
        }
    }

    /**
     * Adds the move notation to the output.
     * @param move The move to add the notation of.
     * @param depth The depth of the variation. The mainline is 0.
     */
    private makeMoveNotation(move: Move, depth: number) {
        let moveTex = move.san.replaceAll('#', '\\#');

        const nagDetails =
            move.nags
                ?.sort(compareNags)
                .map((n) => nags[n])
                .filter((n) => n) ?? [];
        const nagLabel = this.options.skipNags ? '' : nagDetails.map((n) => n.label).join('');

        const clockLabel =
            !this.options.skipClocks && move.commentDiag?.clk
                ? ` #text(size: 0.8em, fill: gray)[${escape(move.commentDiag.clk)}]`
                : '';

        if (!depth) {
            this.result += `*${moveTex}${nagLabel}*${clockLabel}`;
        } else {
            this.result += `${moveTex}${nagLabel}${clockLabel}`;
        }

        if (move.next || move.commentAfter) {
            this.result += ` `;
            if (move.color === Color.black && !move.commentAfter) {
                this.result += ` `;
            }
        }
    }

    /**
     * Adds a diagram of the position after the move into the output.
     * @param move The move to add a diagram after.
     */
    private makeDiagram(move: Move, depth: number) {
        for (let i = 1; i < depth; i++) {
            this.result += `]`;
        }
        this.result += `\n\n#align(center)[`;
        this.result +=
            `#board(` +
            `fen("${move.fen}"),` +
            `display-numbers: true,` +
            `white-square-fill: rgb("#d4e0e5"),` +
            `black-square-fill: rgb("#789ab0"),` +
            `reverse: ${this.options.orientation === 'black'},`;

        if (this.options.skipDrawables) {
            this.result += `marked-squares: (`;
        } else {
            const arrows = move.commentDiag?.colorArrows?.map((arrow) => {
                const squares = `"${arrow.slice(1, 3)} ${arrow.slice(3)}"`;
                return squares;
            });
            if (arrows?.length) {
                this.result += `arrows: (${arrows.join(',')}),`;
            }

            this.result += `marked-squares: (`;

            const squaresByColor = move.commentDiag?.colorFields?.reduce(
                (acc, field) => {
                    const color = field[0];
                    const square = field.slice(1);
                    acc[color] = (acc[color] || []).concat(square);
                    return acc;
                },
                {} as Record<string, string[]>,
            );
            for (const color of Object.keys(squaresByColor || {})) {
                this.result += `"${squaresByColor?.[color].join(' ')}": marks.circle(paint: ${boardColors[color]}),`;
            }
        }

        this.result += `"${move.from}": marks.fill(${lastMoveColor(move.from)}),"${move.to}": marks.fill(${lastMoveColor(move.to)}))`;

        this.result += `)]\n\n`;

        for (let i = 1; i < depth; i++) {
            this.result += `#variation[`;
        }
    }

    /** Adds the result of the game to the output. */
    private makeResult() {
        let result = '';
        switch (this.chess.header().tags.Result) {
            case '1-0':
                result = '1-0 White Wins';
                break;
            case '0-1':
                result = '0-1 Black Wins';
                break;
            case '1/2-1/2':
                result = '1/2-1/2 Draw';
        }

        if (result) {
            this.result += `\n\n#pad(top: 2em)[#align(center)[*${result}*]]\n`;
        }
    }
}

const STATIC_HEADER = `
#import "@preview/board-n-pieces:0.6.0": *

#set page(
    margin: (x: 1.25cm, y: 1.5cm),
    columns: 2,
)

#set text(font: "New Computer Modern")

#set par(justify: true, spacing: 0.75em)

#let variation(doc) = [
    #grid(columns: (5%, 95%), [], [#doc])
]
`;

function getPlayer(name: string | undefined, elo: string | undefined): string {
    let result = name || 'NN';
    if (elo) {
        return `${result} (${elo})`;
    }
    return result;
}

/**
 * Escapes typst control sequences from the given value.
 * https://typst.app/docs/reference/syntax/
 */
function escape(value: string): string {
    return value.replaceAll(/(?<!\\)([\n#$\[\]\</=~+@-])/g, '\\$1');
}

const boardColors: Record<string, string> = {
    Y: 'yellow',
    R: 'red',
    B: 'blue',
    G: 'green',
    O: 'orange',
    C: 'purple',
};

function lastMoveColor(square: Square): string {
    switch (square) {
        case 'a8':
        case 'c8':
        case 'e8':
        case 'g8':
        case 'h8':
        case 'b7':
        case 'd7':
        case 'f7':
        case 'h7':
        case 'a6':
        case 'c6':
        case 'e6':
        case 'g6':
        case 'b5':
        case 'd5':
        case 'f5':
        case 'h5':
        case 'a4':
        case 'c4':
        case 'e4':
        case 'g4':
        case 'b3':
        case 'd3':
        case 'f3':
        case 'h3':
        case 'a2':
        case 'c2':
        case 'e2':
        case 'g2':
        case 'b1':
        case 'd1':
        case 'f1':
        case 'h1':
            return `rgb("#bbd585")`;

        case 'b8':
        case 'd8':
        case 'f8':
        case 'a7':
        case 'c7':
        case 'e7':
        case 'g7':
        case 'b6':
        case 'd6':
        case 'f6':
        case 'h6':
        case 'a5':
        case 'c5':
        case 'e5':
        case 'g5':
        case 'b4':
        case 'd4':
        case 'f4':
        case 'h4':
        case 'a3':
        case 'c3':
        case 'e3':
        case 'g3':
        case 'b2':
        case 'd2':
        case 'f2':
        case 'h2':
        case 'a1':
        case 'c1':
        case 'e1':
        case 'g1':
            return `rgb("#86ad68")`;
    }
}
