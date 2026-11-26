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

/**
 * The fan view on a phone on its side. The players, the guess and the move
 * buttons sit beside the board, as on Lichess, and the rest follows in two
 * columns. The dot is an empty cell. Every part has a place here. The grid
 * would put a part without one into the first empty row it finds.
 */
const FAN_LANDSCAPE_ROWS: readonly (readonly [FanPart | '.', FanPart | '.'])[] = [
    ['board', 'top'],
    ['board', 'guess'],
    ['board', '.'],
    ['board', 'nav'],
    ['board', 'bottom'],
    ['error', 'notice'],
    ['moves', 'twitch'],
    ['evals', 'leaders'],
    ['cross', 'cross'],
];

/** How tall the GamePicker is, which a phone has in place of the game tabs. */
export const GAME_PICKER_HEIGHT = 36;

/**
 * On a phone on its side the board is as tall as the screen has room for under
 * the site's header and the game picker, with 8px above the picker, under it
 * and under the board. It is never so wide that the players beside it have
 * less than about 220px.
 */
export const FAN_LANDSCAPE_BOARD = `min(calc(100dvh - var(--navbar-height) - ${GAME_PICKER_HEIGHT + 24}px), calc(100vw - 340px))`;

/** The grid of the fan view on a phone on its side. */
export const fanLandscapeGrid = {
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gridTemplateAreas: FAN_LANDSCAPE_ROWS.map((row) => `"${row.join(' ')}"`).join(' '),
    // The row with the empty cell stretches. It takes the height the board has
    // left over, so the bottom player is level with the board's bottom edge
    // whenever the parts beside the board are no taller than the board.
    gridTemplateRows: FAN_LANDSCAPE_ROWS.map(([, side]) =>
        side === '.' ? 'minmax(0, 1fr)' : 'auto',
    ).join(' '),
};

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
 * The room on each side of that board when it is narrower than the screen. The
 * board's row and the player bars take the same room, so the bars start and
 * end where the board does. 46px is the eval bar and the gap after it.
 */
export const fanTabletSidesSx = {
    [TABLET_UPRIGHT]: { px: `max(0px, calc((100% - ${FAN_TABLET_BOARD} - 46px) / 2))` },
};

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
 * screen taller than a phone on its side. That is a tablet on its side, or a
 * narrow window.
 */
export const TWO_COLUMNS =
    '@media (min-width: 900px) and (max-width: 1199.95px) and (min-height: 500.05px)';

/** A player's bar, with the clock. */
const PLAYER_BAR_HEIGHT = 37;

/**
 * The rows of the fan view in two columns. The board has the left column to
 * itself, and everything else is beside it. The first screen shows what a fan
 * wants to see all the time: the board, and beside it the game picker, the
 * guess, the stream and the leaderboard.
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

/**
 * In two columns the top player's bar and the board with its buttons span
 * every row. Nothing is under them in their column.
 */
export const fanTopBarSx = {
    [TWO_COLUMNS]: { gridArea: `1 / 1 / ${LAST_LINE} / 2`, alignSelf: 'start' },
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
};

/**
 * In two columns the stream leaves the leaderboard under it about 200px of the
 * first screen, which is the title and three places. The header, the game
 * picker, the guess, the stream's own header and the gaps take 236px more.
 */
export const FAN_STREAM_MAX_HEIGHT = 'max(150px, calc(100dvh - var(--navbar-height) - 436px))';

/** Where a part of the fan view goes on a phone. A wide screen keeps the place it has. */
export function fanPartSx(part: FanPart) {
    // The board alone sets the width of its column. A part under it takes that
    // width and cannot make the column wider.
    const underBoard =
        part !== 'board' &&
        FAN_LANDSCAPE_ROWS.some(([left, right]) => left === part && right !== part);
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
            ...(underBoard && { width: 0, minWidth: '100%' }),
        },
    };
}
