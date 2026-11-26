/**
 * The page layouts. Analysis view 2 puts the players and clocks in a column
 * beside the board, the way chess.com shows a broadcast.
 */
export type WcLayout = 'stream' | 'analysis' | 'analysis2';

const LAYOUTS: readonly WcLayout[] = ['stream', 'analysis', 'analysis2'];

/** A saved layout, or null for anything that is not one, such as an old or unset value. */
export function parseLayout(value: unknown): WcLayout | null {
    return LAYOUTS.includes(value as WcLayout) ? (value as WcLayout) : null;
}

/**
 * The layout the page shows. Only senseis and guest senseis get the analysis
 * views. They start on analysis view 1, unless they picked another view with
 * the switch. A viewer always has the stream view, whatever an earlier visit saved.
 */
export function resolveLayout(saved: WcLayout | null, canAnalyze: boolean): WcLayout {
    if (!canAnalyze) {
        return 'stream';
    }
    return saved ?? 'analysis';
}

/** A phone on its side is wide, but too short to stack the page under the board. */
export const PHONE_LANDSCAPE = '@media (orientation: landscape) and (max-height: 500px)';

/**
 * A phone either way up, and a tablet held upright. Up to the theme's md
 * breakpoint the page has one column. Here the games are a GamePicker and not
 * tabs.
 */
export const PHONE =
    '@media (max-width: 899.95px), (orientation: landscape) and (max-height: 500px)';

/**
 * Every screen narrower than the theme's lg breakpoint, and a phone on its
 * side. Here the fan view has one column or two, and not the three of a wide
 * screen.
 */
export const BELOW_THREE_COLUMNS =
    '@media (max-width: 1199.95px), (orientation: landscape) and (max-height: 500px)';

/**
 * The parts of the fan view, in the order a phone held upright stacks them.
 * The guess comes straight after the board and its buttons, so a guess made on
 * the board shows without scrolling. The stream and the leaderboard are what
 * the show is about, so they come before the moves and the crosstable, which
 * people look things up in.
 */
export const FAN_PARTS = [
    'top',
    'board',
    'bottom',
    'nav',
    'error',
    'notice',
    'guess',
    'evals',
    'twitch',
    'leaders',
    'moves',
    'cross',
] as const;
export type FanPart = (typeof FAN_PARTS)[number];

/** A cell of a grid is a part of the fan view, the game picker or nothing. */
type Cell = FanPart | 'games' | '.';

/**
 * The fan view on a phone on its side. The board is as tall as the screen and
 * stays in view. Beside it the first screen shows the game picker, the two
 * players with their clocks, the stream and the guess, and the page scrolls
 * the rest past the board. Every part has a place here. The grid would put a
 * part without one into the first empty row it finds. The row of dots takes
 * the height that is left over when the board is the taller side.
 */
const FAN_LANDSCAPE_ROWS: readonly (readonly [Cell, Cell, Cell])[] = [
    ['board', 'games', 'games'],
    ['board', 'top', 'bottom'],
    ['board', 'twitch', 'twitch'],
    ['board', 'guess', 'guess'],
    ['board', 'nav', 'nav'],
    ['board', 'error', 'error'],
    ['board', 'notice', 'notice'],
    ['board', 'leaders', 'leaders'],
    ['board', 'evals', 'evals'],
    ['board', 'moves', 'moves'],
    ['board', 'cross', 'cross'],
    ['board', '.', '.'],
];

/** How tall the GamePicker is, which a phone has in place of the game tabs. */
export const GAME_PICKER_HEIGHT = 36;

/**
 * On a phone on its side the board is as tall as the screen has room for under
 * the site's header, with 8px above it and under it. Where the page has a row
 * above the board, which holds a sensei's switch between the views, the board
 * leaves room for that row too. The board is never so wide that the parts
 * beside it have less than about 280px.
 */
export function fanLandscapeBoard(rowAbove: boolean) {
    const taken = 16 + (rowAbove ? GAME_PICKER_HEIGHT + 8 : 0);
    return `min(calc(100dvh - var(--navbar-height) - ${taken}px), calc(100vw - 340px))`;
}

/**
 * A small phone on its side, such as an iPhone SE. Beside the board it has no
 * room for both players in one line, so each has a line.
 */
export const SMALL_PHONE_LANDSCAPE =
    '@media (orientation: landscape) and (max-height: 500px) and (max-width: 699.95px)';

const FAN_SMALL_LANDSCAPE_ROWS = FAN_LANDSCAPE_ROWS.flatMap(
    (row): (readonly [Cell, Cell, Cell])[] =>
        row[1] === 'top'
            ? [
                  ['board', 'top', 'top'],
                  ['board', 'bottom', 'bottom'],
              ]
            : [row],
);

/**
 * On a phone on its side the stream fills what the game picker, the players
 * and the guess leave of the first screen beside the board. Those take 149px
 * with the gaps, and 36px more where each player has a line.
 */
export const fanLandscapeStreamSx = {
    [PHONE_LANDSCAPE]: {
        '--wc-stream-max-height': 'max(90px, calc(100dvh - var(--navbar-height) - 149px))',
    },
    [SMALL_PHONE_LANDSCAPE]: {
        '--wc-stream-max-height': 'max(90px, calc(100dvh - var(--navbar-height) - 185px))',
    },
};

function landscapeGrid(rows: readonly (readonly [Cell, Cell, Cell])[]) {
    return {
        gridTemplateAreas: rows.map((row) => `"${row.join(' ')}"`).join(' '),
        gridTemplateRows: rows
            .map(([, side]) => (side === '.' ? 'minmax(0, 1fr)' : 'auto'))
            .join(' '),
    };
}

/** The grid of the fan view on a phone on its side. */
export const fanLandscapeGrid = {
    gridTemplateColumns: 'auto minmax(0, 1fr) minmax(0, 1fr)',
    ...landscapeGrid(FAN_LANDSCAPE_ROWS),
    columnGap: 1.5,
};

/** The grid on a small phone, with a line for each player. */
export const fanSmallLandscapeGrid = landscapeGrid(FAN_SMALL_LANDSCAPE_ROWS);

/**
 * A tablet held upright, or any other screen that has one column like a phone
 * but is wider than a phone held upright and taller than a phone on its side.
 */
export const TABLET_UPRIGHT =
    '@media (min-width: 600px) and (max-width: 899.95px) and (min-height: 500.05px)';

/**
 * On such a screen a board as wide as the screen would push the guess off it.
 * The board leaves 325px under the site's header for the game picker, the
 * player bars, the move buttons, the guess and the senseis.
 */
export const FAN_TABLET_BOARD = 'max(360px, calc(100dvh - var(--navbar-height) - 325px))';

/**
 * A phone on its side in the two analysis views, where it has the one column
 * of a phone held upright. A screen 900px wide or more has two columns there.
 */
export const ANALYSIS_PHONE_LANDSCAPE =
    '@media (orientation: landscape) and (max-height: 500px) and (max-width: 899.95px)';

/**
 * Nobody analyses on a phone, so on such a screen the analysis views do no more
 * than keep the board from being taller than the screen. It leaves the site's
 * header and a margin.
 */
export const ANALYSIS_LANDSCAPE_BOARD = 'max(240px, calc(100dvh - var(--navbar-height) - 16px))';

/**
 * Below the lg breakpoint the two columns of the fan view have no box of their
 * own, so the page can place their parts one by one.
 */
export const fanUnwrapSx = {
    display: { xs: 'contents', lg: 'flex' },
    [PHONE_LANDSCAPE]: { display: 'contents' },
};

/**
 * The fan view has two columns from the theme's md breakpoint up to lg, on a
 * screen that is wider than tall and taller than a phone on its side. That is
 * a tablet on its side, or a narrow window.
 */
export const TWO_COLUMNS =
    '@media (min-width: 900px) and (max-width: 1199.95px) and (min-height: 500.05px) and (orientation: landscape)';

/** Two columns on a screen tall enough for the board's column to fit under the site's header. */
const BOARD_STAYS =
    '@media (min-width: 900px) and (max-width: 1199.95px) and (min-height: 600px) and (orientation: landscape)';

/**
 * A large tablet held upright, such as an iPad Pro 12.9. It is as wide as a
 * screen with two columns, but taller than wide. In a column of its own the
 * board would leave half of such a screen empty.
 */
export const UPRIGHT_WIDE =
    '@media (min-width: 900px) and (max-width: 1199.95px) and (orientation: portrait)';

/**
 * The rows of the fan view on such a screen. The board has the full width, as
 * on a smaller tablet held upright. Under it the stream and the leaderboard
 * share a row, so the first screen shows both with the board. The moves and
 * the crosstable share the row after that.
 */
const FAN_UPRIGHT_WIDE_ROWS: readonly (readonly [FanPart, FanPart])[] = [
    ['top', 'top'],
    ['board', 'board'],
    ['bottom', 'bottom'],
    ['nav', 'nav'],
    ['error', 'error'],
    ['notice', 'notice'],
    ['guess', 'guess'],
    ['evals', 'evals'],
    ['twitch', 'leaders'],
    ['moves', 'cross'],
];

/** The grid of the fan view on a large tablet held upright. */
export const fanUprightWideGrid = {
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gridTemplateAreas: FAN_UPRIGHT_WIDE_ROWS.map((row) => `"${row.join(' ')}"`).join(' '),
    gridTemplateRows: 'none',
};

/**
 * On such a screen the board is short enough for the first screen to hold the
 * row with the stream too. The site's header, the game picker, the player
 * bars, the move buttons, the guess with its how-to line and the senseis take
 * 451px with the stream's own header. The player is half the page wide, less
 * 62px of margins, and nine sixteenths of that tall.
 */
export const FAN_UPRIGHT_WIDE_BOARD =
    'max(360px, calc(100dvh - var(--navbar-height) - 451px - (100vw - 124px) * 0.28125))';

/**
 * The room on each side of the board on a tablet held upright, when the board
 * is narrower than the screen. The board's row and the player bars take the
 * same room, so the bars start and end where the board does. 46px is the eval
 * bar and the gap after it.
 */
export const fanTabletSidesSx = {
    [TABLET_UPRIGHT]: { px: `max(0px, calc((100% - ${FAN_TABLET_BOARD} - 46px) / 2))` },
    [UPRIGHT_WIDE]: { px: `max(0px, calc((100% - ${FAN_UPRIGHT_WIDE_BOARD} - 46px) / 2))` },
};

/** A player's bar, with the clock. */
const PLAYER_BAR_HEIGHT = 37;

/**
 * The rows of the fan view in two columns. The board has the left column to
 * itself and stays in view. Everything else is beside it, and the page scrolls
 * it past the board. The first screen shows what a fan wants to see all the
 * time: the board, and beside it the game picker, the guess, the stream and
 * the leaderboard.
 *
 * The dots on the left are where the top player's bar and the board with its
 * buttons go. They span every row, so each row is as tall as the part on its
 * right. The row of two dots takes the height that is left over when the
 * board's column is the taller of the two.
 */
const FAN_TWO_COLUMN_ROWS = [
    ['.', 'games'],
    ['.', 'guess'],
    ['.', 'twitch'],
    ['.', 'leaders'],
    ['.', 'evals'],
    ['.', 'moves'],
    ['.', 'cross'],
    ['.', 'notice'],
    ['.', '.'],
] as const;

/** The grid line under the last row. */
const LAST_LINE = FAN_TWO_COLUMN_ROWS.length + 1;

/** The grid of the fan view in two columns. */
export const fanTwoColumnGrid = {
    gridTemplateAreas: FAN_TWO_COLUMN_ROWS.map((row) => `"${row.join(' ')}"`).join(' '),
    gridTemplateRows: FAN_TWO_COLUMN_ROWS.map(([left, right], i) => {
        if (i === 0) {
            // The top player's bar sits in the first row, on the left.
            return `minmax(${PLAYER_BAR_HEIGHT}px, auto)`;
        }
        return left === '.' && right === '.' ? 'minmax(0, 1fr)' : 'auto';
    }).join(' '),
};

/**
 * The width of the board's column in two columns. The board is no taller than
 * the screen has room for. The site's header, the player bars and the move
 * buttons take 161px of the height, and the tabs 64px more where the page
 * shows them. The eval bar adds 46px to the column's width.
 */
export function boardColumnWidth(tabs: boolean) {
    return `minmax(0, max(406px, calc(100dvh - var(--navbar-height) - ${(tabs ? 225 : 161) - 46}px)))`;
}

/** The page's top padding. The board's column rests that far under the site's header. */
const BOARD_STAYS_AT = 24;

/**
 * In two columns the top player's bar and the board with its buttons span
 * every row, and stay in view while the page scrolls the column beside them.
 * Nothing is under them in their column, so they never cover anything.
 */
export const fanTopBarSx = {
    [TWO_COLUMNS]: { gridArea: `1 / 1 / ${LAST_LINE} / 2`, alignSelf: 'start' },
    [BOARD_STAYS]: {
        position: 'sticky',
        top: `calc(var(--navbar-height) + ${BOARD_STAYS_AT}px)`,
    },
};
export const fanBoardBlockSx = {
    // Everywhere else the page places the board, the bottom player's bar and
    // the buttons one by one.
    display: 'contents',
    [TWO_COLUMNS]: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
        gridArea: `2 / 1 / ${LAST_LINE} / 2`,
        alignSelf: 'start',
    },
    [BOARD_STAYS]: {
        position: 'sticky',
        // Under the top player's bar and the gap after it.
        top: `calc(var(--navbar-height) + ${BOARD_STAYS_AT + PLAYER_BAR_HEIGHT + 8}px)`,
    },
};

/**
 * In two columns the stream leaves the leaderboard under it about 200px of the
 * first screen, which is the title and three places. The header, the game
 * picker, the guess, the stream's own header and the gaps take 236px more.
 */
export const FAN_STREAM_MAX_HEIGHT = 'max(150px, calc(100dvh - var(--navbar-height) - 436px))';

/** Where a part of the fan view goes on a phone. A wide screen keeps the place it has. */
export function fanPartSx(part: FanPart) {
    return {
        // A part goes to the place with its name wherever the page's grid has
        // one. Inside a column, as on a wide screen, the name does nothing.
        gridArea: part,
        // A part with nothing in it, such as the crosstable before it has loaded,
        // takes no room on any screen.
        '&:empty': { display: 'none' },
        [PHONE]: { minWidth: 0, order: FAN_PARTS.indexOf(part), gridArea: 'auto' },
        // A phone on its side matches both rules. This one comes last, so it wins.
        [PHONE_LANDSCAPE]: {
            gridArea: part,
            // The board stays in view while the page scrolls the parts beside it.
            ...(part === 'board' && {
                alignSelf: 'start',
                position: 'sticky',
                top: 'calc(var(--navbar-height) + 8px)',
            }),
        },
    };
}
