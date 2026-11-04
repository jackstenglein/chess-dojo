export const CONTAINER_ID = 'resize-container';

const breakpoints = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
};

const minBoardSize = 275;
const navbarHeight = 80;
const playerHeaderHeight = 27.9833;
const controlsHeight = 40;
const controlsMargin = 8;
const margin = 64;
const defaultMaxPanelWidth = 470;

export interface BoardLayoutOptions {
    showPgn?: boolean;
    showPanelControls?: boolean;
    /** Whether the buttons under the board are hidden. */
    hideBoardButtons?: boolean;
}

export const RESTORE_GUTTER_WIDTH = 36;

/** Fit the board without changing the normal layout or the visible panels' widths. */
export function getFittedSizes(
    sizes: AreaSizes,
    parentWidth: number,
    showUnderboard: boolean,
    showPgn: boolean,
): AreaSizes {
    const leftInRow = showUnderboard && sizes.breakpoint === 'md';
    const rightInRow = showPgn && sizes.breakpoint !== 'xs';
    const panelCount = Number(leftInRow) + Number(rightInRow);
    const availableWidth = parentWidth - sizes.padding;
    const boardSize = Math.max(
        1,
        Math.min(
            availableWidth -
                RESTORE_GUTTER_WIDTH -
                panelCount * sizes.spacing -
                (leftInRow ? sizes.underboard.width : 0) -
                (rightInRow ? sizes.pgn.width : 0),
            getMaxBoardAreaHeight(),
        ),
    );
    return {
        ...sizes,
        availableWidth,
        board: {
            ...sizes.board,
            width: boardSize,
            height: boardSize,
            minWidth: boardSize,
            maxWidth: boardSize,
            minHeight: boardSize,
            maxHeight: boardSize,
        },
    };
}

const hiddenPanel: ResizableData = {
    width: 0,
    height: 0,
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
};

export interface ResizableData {
    width: number;
    minWidth: number;
    maxWidth: number;
    height: number;
    minHeight: number;
    maxHeight: number;
    order?: number;
}

export interface AreaSizes {
    breakpoint: 'xs' | 'sm' | 'md';
    availableWidth: number;
    board: ResizableData;
    underboard: ResizableData;
    pgn: ResizableData;
    padding: number;
    spacing: number;
}

export function getSizes(
    parentWidth: number,
    showUnderboard?: boolean,
    hidePlayerHeaders?: boolean,
    options: BoardLayoutOptions = {},
): AreaSizes {
    let sizes: AreaSizes;
    if (parentWidth < breakpoints.sm) {
        sizes = xsSizes(parentWidth, showUnderboard, hidePlayerHeaders, options);
    } else if (parentWidth < breakpoints.md) {
        sizes = smSizes(parentWidth, showUnderboard, hidePlayerHeaders, options);
    } else {
        sizes = mdSizes(parentWidth, showUnderboard, hidePlayerHeaders, options);
    }
    if (options.showPgn === false) sizes.pgn = { ...hiddenPanel };
    return sizes;
}

function xsSizes(
    parentWidth: number,
    showUnderboard?: boolean,
    hidePlayerHeaders?: boolean,
    { showPanelControls }: BoardLayoutOptions = {},
): AreaSizes {
    const padding = 6;
    const boardSize = parentWidth - padding;
    const playerHeadersHeight = hidePlayerHeaders ? 0 : 2 * playerHeaderHeight;

    return {
        breakpoint: 'xs',
        availableWidth: boardSize,
        board: {
            width: boardSize,
            minWidth: boardSize,
            maxWidth: boardSize,
            height: boardSize,
            minHeight: boardSize,
            maxHeight: boardSize,
        },
        pgn: {
            width: boardSize,
            minWidth: boardSize,
            maxWidth: boardSize,
            height: Math.max(
                showPanelControls ? 200 : -Infinity,
                window.innerHeight -
                    boardSize -
                    controlsHeight -
                    controlsMargin -
                    playerHeadersHeight -
                    16,
            ),
            minHeight: 200,
            maxHeight: Infinity,
        },
        underboard: showUnderboard
            ? {
                  width: boardSize,
                  minWidth: boardSize,
                  maxWidth: boardSize,
                  height: 512,
                  minHeight: 200,
                  maxHeight: Infinity,
                  order: 1,
              }
            : { ...hiddenPanel },
        padding,
        spacing: 0,
    };
}

function smSizes(
    parentWidth: number,
    showUnderboard?: boolean,
    hidePlayerHeaders?: boolean,
    { showPgn = true, showPanelControls, hideBoardButtons }: BoardLayoutOptions = {},
): AreaSizes {
    const padding = 6;
    const spacing = 4;
    const availableWidth = parentWidth - padding - (showPgn ? spacing : 0);
    const preferredBoardSize = availableWidth * (showPgn ? 0.66 : 1);
    const boardSize = showPanelControls
        ? Math.min(
              preferredBoardSize,
              getMaxBoardHeight(hidePlayerHeaders, showPanelControls, hideBoardButtons),
          )
        : preferredBoardSize;
    const pgnWidth = availableWidth - boardSize;
    const boardAreaHeight = getBoardAreaHeight(boardSize, hidePlayerHeaders, hideBoardButtons);

    return {
        breakpoint: 'sm',
        availableWidth,
        board: {
            width: boardSize,
            minWidth: showPanelControls ? Math.min(minBoardSize, boardSize) : minBoardSize,
            maxWidth: boardSize,
            height: boardSize,
            minHeight: showPanelControls ? Math.min(minBoardSize, boardSize) : minBoardSize,
            maxHeight: boardSize,
        },
        pgn: {
            width: pgnWidth,
            minWidth: 100,
            maxWidth: pgnWidth,
            height: boardAreaHeight,
            minHeight: 100,
            maxHeight: boardAreaHeight,
        },
        underboard: showUnderboard
            ? {
                  width: parentWidth - padding,
                  minWidth: parentWidth - padding,
                  maxWidth: parentWidth - padding,
                  height: 512,
                  minHeight: 200,
                  maxHeight: Infinity,
                  order: 1,
              }
            : { ...hiddenPanel },
        padding,
        spacing,
    };
}

function mdSizes(
    parentWidth: number,
    showUnderboard?: boolean,
    hidePlayerHeaders?: boolean,
    { showPgn = true, showPanelControls, hideBoardButtons }: BoardLayoutOptions = {},
): AreaSizes {
    const padding = 24;
    const spacing = 8;

    const panelCount = Number(Boolean(showUnderboard)) + Number(showPgn);
    const availableWidth = parentWidth - padding - (showPanelControls ? panelCount : 2) * spacing;
    const maxBoardWidth = availableWidth * (panelCount === 2 ? 0.4 : panelCount === 1 ? 0.66 : 1);
    const maxBoardHeight = getMaxBoardHeight(
        hidePlayerHeaders,
        showPanelControls,
        hideBoardButtons,
    );
    const boardSize = Math.min(maxBoardWidth, maxBoardHeight);

    let panelWidth = panelCount ? (availableWidth - boardSize) / panelCount : 0;
    if (panelCount == 1) {
        panelWidth = Math.min(panelWidth, defaultMaxPanelWidth);
    }
    const pgnWidth = showPgn ? panelWidth : 0;
    const underboardWidth = showUnderboard ? panelWidth : 0;

    const maxBoardAreaHeight = showPanelControls
        ? Math.max(1, getMaxBoardAreaHeight())
        : getMaxBoardAreaHeight();

    return {
        breakpoint: 'md',
        availableWidth,
        board: {
            width: boardSize,
            height: boardSize,
            maxWidth: boardSize,
            maxHeight: maxBoardHeight,
            minWidth: showPanelControls ? Math.min(minBoardSize, boardSize) : minBoardSize,
            minHeight: showPanelControls ? Math.min(minBoardSize, boardSize) : minBoardSize,
        },
        pgn: {
            width: pgnWidth,
            height: maxBoardAreaHeight,
            maxWidth: pgnWidth,
            maxHeight: maxBoardAreaHeight,
            minWidth: 100,
            minHeight: showPanelControls ? Math.min(200, maxBoardAreaHeight) : 200,
        },
        underboard: showUnderboard
            ? {
                  width: underboardWidth,
                  height: maxBoardAreaHeight,
                  maxWidth: underboardWidth,
                  maxHeight: maxBoardAreaHeight,
                  minWidth: 100,
                  minHeight: showPanelControls ? Math.min(200, maxBoardAreaHeight) : 200,
              }
            : { ...hiddenPanel },
        padding,
        spacing,
    };
}

export function getNewSizes(
    currentSizes: AreaSizes,
    hidePlayerHeaders?: boolean,
    options: BoardLayoutOptions = {},
): AreaSizes {
    if (currentSizes.breakpoint === 'xs') {
        return currentSizes;
    }

    const maxBoardHeight = getMaxBoardHeight(
        hidePlayerHeaders,
        options.showPanelControls,
        options.hideBoardButtons,
    );
    let maxBoardWidth = currentSizes.availableWidth - currentSizes.pgn.width;

    if (currentSizes.breakpoint === 'sm') {
        const maxBoardSize = Math.min(maxBoardHeight, maxBoardWidth);
        return {
            ...currentSizes,
            board: {
                ...currentSizes.board,
                maxWidth: maxBoardSize,
                maxHeight: maxBoardSize,
            },
            pgn: {
                ...currentSizes.pgn,
                maxWidth:
                    currentSizes.pgn.width === 0
                        ? 0
                        : currentSizes.availableWidth - currentSizes.board.width,
            },
        };
    }

    maxBoardWidth -= currentSizes.underboard.width;
    const maxBoardSize = Math.min(maxBoardHeight, maxBoardWidth);
    return {
        ...currentSizes,
        board: {
            ...currentSizes.board,
            maxWidth: maxBoardSize,
            maxHeight: maxBoardSize,
        },
        pgn: {
            ...currentSizes.pgn,
            maxWidth:
                currentSizes.pgn.width === 0
                    ? 0
                    : currentSizes.availableWidth -
                      currentSizes.board.width -
                      currentSizes.underboard.width,
        },
        underboard: {
            ...currentSizes.underboard,
            maxWidth:
                currentSizes.underboard.width === 0
                    ? 0
                    : currentSizes.availableWidth -
                      currentSizes.board.width -
                      currentSizes.pgn.width,
        },
    };
}

function getBoardAreaHeight(
    boardSize: number,
    hidePlayerHeaders?: boolean,
    hideBoardButtons?: boolean,
): number {
    const playerHeadersHeight = hidePlayerHeaders ? 0 : 2 * playerHeaderHeight;
    const boardButtonHeight = hideBoardButtons ? 0 : controlsHeight + controlsMargin;
    return boardSize + playerHeadersHeight + boardButtonHeight;
}

function getMaxBoardHeight(
    hidePlayerHeaders?: boolean,
    showPanelControls?: boolean,
    hideBoardButtons?: boolean,
): number {
    const playerHeadersHeight = hidePlayerHeaders ? 0 : 2 * playerHeaderHeight;
    const effectiveControlsHeight = hideBoardButtons ? 0 : controlsHeight + controlsMargin;
    return Math.max(
        showPanelControls ? 1 : -Infinity,
        window.innerHeight - navbarHeight - playerHeadersHeight - effectiveControlsHeight - margin,
    );
}

function getMaxBoardAreaHeight(): number {
    return window.innerHeight - navbarHeight - margin;
}
