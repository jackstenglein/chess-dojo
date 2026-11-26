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
 * On a phone the two columns of the fan view have no box of their own, so the
 * page can place their parts one by one.
 */
export const fanUnwrapSx = { [PHONE]: { display: 'contents' } };

/** Where a part of the fan view goes on a phone. A wide screen keeps the place it has. */
export function fanPartSx(part: FanPart) {
    // The board alone sets the width of its column. A part under it takes that
    // width and cannot make the column wider.
    const underBoard =
        part !== 'board' &&
        FAN_LANDSCAPE_ROWS.some(([left, right]) => left === part && right !== part);
    return {
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
