import useGame from '@/context/useGame';
import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Color } from '@lichess-org/chessground/types';
import { Stack } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'react-resizable/css/styles.css';
import { onInitializeFunc } from '../Board';
import KeyboardHandler from './KeyboardHandler';
import ResizableBoardArea from './ResizableBoardArea';
import NagControls, { NAG_CONTROLS_HEIGHT } from './boardTools/underboard/NagControls';
import Underboard, { UnderboardApi } from './boardTools/underboard/Underboard';
import { DefaultUnderboardTab, UnderboardTab } from './boardTools/underboard/underboardTabs';
import { PgnTextBanners, ResizablePgnText } from './pgnText/PgnText';
import {
    AreaSizes,
    getBoardAreaHeight,
    getFittedSizes,
    getNewSizes,
    getSizes,
    resizeSidePanel,
} from './resize';

export const CONTAINER_ID = 'resize-container';

function getParentWidth() {
    return document.getElementById(CONTAINER_ID)?.getBoundingClientRect().width || 0;
}

function getPanelStorageKey(prefix: string | undefined, side: 'left' | 'right') {
    return prefix ? `${prefix}.${side}.tab` : undefined;
}

function getExplorerStorageKey(prefix: string | undefined, side: 'left' | 'right') {
    return prefix ? `${prefix}.${side}.explorerTab` : undefined;
}

interface ResizableContainerProps {
    allowPanelHiding?: boolean;
    underboardTabs: UnderboardTab[];
    initialUnderboardTab?: string;
    rightTabs?: UnderboardTab[];
    initialRightTab?: string;
    tabStorageKeyPrefix?: string;
    sidePanelTabs?: DefaultUnderboardTab[];
    pgn?: string;
    fen?: string;
    showPlayerHeaders?: boolean;
    /** Whether the control buttons under the board are hidden. */
    hideBoardButtons?: boolean;
    startOrientation?: Color;
    onInitialize: onInitializeFunc;
}

const ResizableContainer: React.FC<ResizableContainerProps> = ({
    allowPanelHiding = false,
    underboardTabs,
    initialUnderboardTab,
    rightTabs,
    initialRightTab,
    tabStorageKeyPrefix,
    sidePanelTabs,
    showPlayerHeaders,
    hideBoardButtons,
    pgn,
    fen,
    startOrientation,
    onInitialize,
}) => {
    const { isOwner } = useGame();
    const showNagControls =
        isOwner &&
        [...underboardTabs, ...(rightTabs ?? [])].some(
            (tab) => tab === DefaultUnderboardTab.Tags || tab === DefaultUnderboardTab.Editor,
        );

    const underboardRef = useRef<UnderboardApi>(null);
    const hasLeftPanel = underboardTabs.length > 0;
    const hasRightPanel = rightTabs === undefined || rightTabs.length > 0;
    const [leftVisible, setLeftVisible] = useState(true);
    const [rightVisible, setRightVisible] = useState(true);
    const showUnderboard = hasLeftPanel && (!allowPanelHiding || leftVisible);
    const showPgn = hasRightPanel && (!allowPanelHiding || rightVisible);
    const extraControlsHeight = showNagControls && !hasRightPanel ? NAG_CONTROLS_HEIGHT : 0;
    const showPanelControls = allowPanelHiding && (hasLeftPanel || hasRightPanel);

    const [boardAreaHeight, setBoardAreaHeight] = useState<number>();
    const [sizes, setSizes] = useState<AreaSizes | null>(null);
    const [fittedBase, setFittedBase] = useState<AreaSizes | null>(null);
    const barsHidden = allowPanelHiding && fittedBase !== null;

    const calcSizes = useCallback(() => {
        const parentWidth = getParentWidth();

        // Visibility only changes which panels occupy the layout, not their saved dimensions.
        return getSizes(parentWidth, hasLeftPanel, !showPlayerHeaders, {
            hideBoardButtons,
            extraControlsHeight,
            showPgn: hasRightPanel,
            showPanelControls,
        });
    }, [
        hasLeftPanel,
        showPlayerHeaders,
        hasRightPanel,
        showPanelControls,
        hideBoardButtons,
        extraControlsHeight,
    ]);

    const onWindowResize = useCallback(() => {
        const nextSizes = calcSizes();
        setSizes(nextSizes);
        setFittedBase((current) => (current ? nextSizes : null));
    }, [setSizes, calcSizes]);

    useEffect(() => {
        onWindowResize();
    }, [setSizes, calcSizes, onWindowResize]);

    useWindowSizeEffect(onWindowResize);

    const onResize = useCallback(
        (area: 'board' | 'underboard' | 'pgn') => (width: number, height: number) => {
            const updateSizes = barsHidden ? setFittedBase : setSizes;
            updateSizes((sizes) => {
                if (!sizes) {
                    sizes = calcSizes();
                }
                if (area !== 'board') {
                    return resizeSidePanel(sizes, area, width, !showPlayerHeaders, {
                        showPgn: hasRightPanel,
                        showPanelControls,
                        hideBoardButtons,
                        extraControlsHeight,
                    });
                }
                return getNewSizes(
                    {
                        ...sizes,
                        [area]: {
                            ...sizes[area],
                            width,
                            height,
                        },
                    },
                    !showPlayerHeaders,
                    {
                        showPgn: hasRightPanel,
                        showPanelControls,
                        hideBoardButtons,
                        extraControlsHeight,
                    },
                );
            });
        },
        [
            setSizes,
            calcSizes,
            showPlayerHeaders,
            hasRightPanel,
            showPanelControls,
            barsHidden,
            hideBoardButtons,
            extraControlsHeight,
        ],
    );

    if (!sizes) {
        return null;
    }

    const displayedSizes = barsHidden
        ? getFittedSizes(fittedBase, getParentWidth(), showUnderboard, showPgn)
        : sizes;

    const showRightSymbols = showNagControls && hasRightPanel && showPgn && !barsHidden;
    const notationSize = {
        ...displayedSizes.pgn,
        height: Math.max(
            100,
            Math.min(
                displayedSizes.pgn.height,
                barsHidden
                    ? displayedSizes.board.height
                    : (boardAreaHeight ??
                          getBoardAreaHeight(
                              displayedSizes.board.height,
                              !showPlayerHeaders,
                              hideBoardButtons,
                          )),
            ) - (showRightSymbols ? NAG_CONTROLS_HEIGHT : 0),
        ),
    };

    return (
        <Stack
            direction='row'
            spacing={{ xs: 0, sm: 0 }}
            sx={{
                width: 1,
                maxWidth: 1,
                justifyContent: 'center',
                alignItems: 'flex-start',
                px: { xs: 0, sm: 0 },
                flexWrap: 'wrap',
                rowGap: 0.5,
                columnGap: { xs: 0.5, md: 1, lg: 1 },
            }}
        >
            <KeyboardHandler underboardRef={underboardRef} />

            {hasLeftPanel && (
                <Underboard
                    hidden={!showUnderboard}
                    onReveal={() => setLeftVisible(true)}
                    ref={underboardRef}
                    tabs={underboardTabs}
                    initialTab={initialUnderboardTab}
                    resizeData={displayedSizes.underboard}
                    onResize={onResize('underboard')}
                    storageKey={getPanelStorageKey(tabStorageKeyPrefix, 'left')}
                    explorerStorageKey={getExplorerStorageKey(tabStorageKeyPrefix, 'left')}
                    sidePanelTabs={sidePanelTabs}
                />
            )}

            <ResizableBoardArea
                {...{
                    showNagControls: showNagControls && !hasRightPanel,
                    onHeightChange: setBoardAreaHeight,
                    resizeData: displayedSizes.board,
                    onResize: onResize('board'),
                    hideResize: barsHidden || sizes.breakpoint === 'xs',
                    barsHidden,
                    onToggleBars: allowPanelHiding
                        ? () => setFittedBase((current) => (current ? null : sizes))
                        : undefined,
                    showPlayerHeaders,
                    hideBoardButtons,
                    pgn,
                    fen,
                    startOrientation,
                    onInitialize,
                    underboardRef,
                    panelControls: showPanelControls
                        ? {
                              left: hasLeftPanel
                                  ? {
                                        visible: showUnderboard,
                                        onToggle: () => setLeftVisible((value) => !value),
                                    }
                                  : undefined,
                              right: hasRightPanel
                                  ? {
                                        visible: showPgn,
                                        onToggle: () => setRightVisible((value) => !value),
                                    }
                                  : undefined,
                          }
                        : undefined,
                }}
            />

            <Stack
                data-notation-pane
                sx={{
                    width: showPgn ? displayedSizes.pgn.width : undefined,
                    display: showPgn ? 'flex' : 'contents',
                    height: showPgn ? boardAreaHeight : undefined,
                    minHeight: 0,
                    boxSizing: 'border-box',
                    '& > [data-testid="board-nag-controls"]': { mt: 'auto', flexShrink: 0 },
                }}
            >
                {rightTabs ? (
                    <Underboard
                        hidden={!showPgn}
                        onReveal={() => setRightVisible(true)}
                        tabs={rightTabs}
                        initialTab={initialRightTab}
                        resizeData={notationSize}
                        onResize={onResize('pgn')}
                        storageKey={getPanelStorageKey(tabStorageKeyPrefix, 'right')}
                        explorerStorageKey={getExplorerStorageKey(tabStorageKeyPrefix, 'right')}
                        buttonTestIdPrefix='right-'
                        header={<PgnTextBanners />}
                        sidePanelTabs={sidePanelTabs}
                    />
                ) : (
                    <ResizablePgnText
                        hidden={!showPgn}
                        resizeData={notationSize}
                        onResize={onResize('pgn')}
                    />
                )}
                {showRightSymbols && <NagControls underboardRef={underboardRef} />}
            </Stack>
        </Stack>
    );
};

export default ResizableContainer;
