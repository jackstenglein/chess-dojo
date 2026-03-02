import { grey } from '@mui/material/colors';
import { BoardStyle, PieceStyle } from './pgn/boardTools/underboard/settings/ViewerSettings';

interface BoardSx {
    '--board-background': string;
    '--light-square-coord-color': string;
    '--dark-square-coord-color': string;
}

interface PieceSx {
    '--white-pawn': string;
    '--white-bishop': string;
    '--white-knight': string;
    '--white-rook': string;
    '--white-queen': string;
    '--white-king': string;
    '--black-pawn': string;
    '--black-bishop': string;
    '--black-knight': string;
    '--black-rook': string;
    '--black-queen': string;
    '--black-king': string;
}

/**
 * Returns a set of CSS vars that should be passed to the board wrapper's MUI sx prop,
 * based on the provided board style.
 * @param style The board style to get CSS vars for.
 * @returns A set of CSS vars that should be passed to the board wrapper's MUI sx prop.
 */
export function getBoardSx(style: BoardStyle): BoardSx {
    switch (style) {
        case BoardStyle.Standard:
            return {
                '--board-background': `url('/static/board/backgrounds/standard.png')`,
                '--light-square-coord-color': '#7296ac',
                '--dark-square-coord-color': '#fff',
            };
        case BoardStyle.Ocean:
            return {
                '--board-background': `url('/static/board/backgrounds/ocean.png')`,
                '--dark-square-coord-color': '#bbcfff',
                '--light-square-coord-color': '#5477ca',
            };
        case BoardStyle.CherryBlossom:
            return {
                '--board-background': `url('/static/board/backgrounds/cherry-blossom.png')`,
                '--dark-square-coord-color': '#f1f1c9',
                '--light-square-coord-color': '#f37a7a',
            };
        case BoardStyle.Moon:
            return {
                '--board-background': `url('/static/board/backgrounds/moon.jpg')`,
                '--dark-square-coord-color': grey['300'],
                '--light-square-coord-color': grey['800'],
            };
        case BoardStyle.Summer:
            return {
                '--board-background': `url('/static/board/backgrounds/summer.png')`,
                '--dark-square-coord-color': '#f1f6b2',
                '--light-square-coord-color': '#59935d',
            };
        case BoardStyle.Walnut:
            return {
                '--board-background': `url('/static/board/backgrounds/walnut.jpg')`,
                '--dark-square-coord-color': '#e0c498',
                '--light-square-coord-color': '#9f6853',
            };
        case BoardStyle.Wood:
            return {
                '--board-background': `url('/static/board/backgrounds/wood.jpg')`,
                '--dark-square-coord-color': '#d9a55a',
                '--light-square-coord-color': '#88471d',
            };
    }
}

/**
 * Returns a set of CSS vars that should be passed to the board wrapper's MUI sx prop,
 * based on the provided piece style.
 * @param style The piece style to get the CSS vars for.
 * @returns A set of CSS vars that should be passed to the board wrapper's MUI sx prop.
 */
export function getPieceSx(style: PieceStyle): PieceSx {
    switch (style) {
        case PieceStyle.Standard:
            return getStandardPieceBackgrounds('/static/board/pieces/standard/', '.webp');
        case PieceStyle.Pixel:
            return getStandardPieceBackgrounds('/static/board/pieces/pixel/', '.svg');
        case PieceStyle.Spatial:
            return getStandardPieceBackgrounds('/static/board/pieces/spatial/', '.svg');
        case PieceStyle.Celtic:
            return getStandardPieceBackgrounds('/static/board/pieces/celtic/', '.svg');
        case PieceStyle.Fantasy:
            return getStandardPieceBackgrounds('/static/board/pieces/fantasy/', '.svg');
        case PieceStyle.Chessnut:
            return getStandardPieceBackgrounds('/static/board/pieces/chessnut/', '.svg');
        case PieceStyle.Cburnett:
            return getStandardPieceBackgrounds('/static/board/pieces/cburnett/', '.svg');
        case PieceStyle.ThreeD:
            return getStandardPieceBackgrounds('/static/board/pieces/three-d-basic/', '.png');
        case PieceStyle.ThreeDRedBlue:
            return getStandardPieceBackgrounds('/static/board/pieces/three-d/', '.png');
        case PieceStyle.Disguised:
            return {
                '--white-pawn': `url('/static/board/pieces/disguised/w.svg')`,
                '--white-bishop': `url('/static/board/pieces/disguised/w.svg')`,
                '--white-knight': `url('/static/board/pieces/disguised/w.svg')`,
                '--white-rook': `url('/static/board/pieces/disguised/w.svg')`,
                '--white-queen': `url('/static/board/pieces/disguised/w.svg')`,
                '--white-king': `url('/static/board/pieces/disguised/w.svg')`,
                '--black-pawn': `url('/static/board/pieces/disguised/b.svg')`,
                '--black-bishop': `url('/static/board/pieces/disguised/b.svg')`,
                '--black-knight': `url('/static/board/pieces/disguised/b.svg')`,
                '--black-rook': `url('/static/board/pieces/disguised/b.svg')`,
                '--black-queen': `url('/static/board/pieces/disguised/b.svg')`,
                '--black-king': `url('/static/board/pieces/disguised/b.svg')`,
            };
        case PieceStyle.Invisible:
            return {
                '--white-pawn': `none`,
                '--white-bishop': `none`,
                '--white-knight': `none`,
                '--white-rook': `none`,
                '--white-queen': `none`,
                '--white-king': `none`,
                '--black-pawn': `none`,
                '--black-bishop': `none`,
                '--black-knight': `none`,
                '--black-rook': `none`,
                '--black-queen': `none`,
                '--black-king': `none`,
            };
    }
}

/**
 * Returns a set of CSS piece backgrounds vars in standard format. IE: urlPrefix followed by wP,
 * wB, bP, etc. followed by urlSuffix.
 * @param urlPrefix The prefix of the piece URL. IE: the portion before wP, wB, etc.
 * @param urlSuffix The suffix of the piece URL. IE: the portion after wP, wB, etc.
 * @returns A set of CSS piece background vars.
 */
function getStandardPieceBackgrounds(urlPrefix: string, urlSuffix: string): PieceSx {
    return {
        '--white-pawn': `url('${urlPrefix}wP${urlSuffix}')`,
        '--white-bishop': `url('${urlPrefix}wB${urlSuffix}')`,
        '--white-knight': `url('${urlPrefix}wN${urlSuffix}')`,
        '--white-rook': `url('${urlPrefix}wR${urlSuffix}')`,
        '--white-queen': `url('${urlPrefix}wQ${urlSuffix}')`,
        '--white-king': `url('${urlPrefix}wK${urlSuffix}')`,
        '--black-pawn': `url('${urlPrefix}bP${urlSuffix}')`,
        '--black-bishop': `url('${urlPrefix}bB${urlSuffix}')`,
        '--black-knight': `url('${urlPrefix}bN${urlSuffix}')`,
        '--black-rook': `url('${urlPrefix}bR${urlSuffix}')`,
        '--black-queen': `url('${urlPrefix}bQ${urlSuffix}')`,
        '--black-king': `url('${urlPrefix}bK${urlSuffix}')`,
    };
}
