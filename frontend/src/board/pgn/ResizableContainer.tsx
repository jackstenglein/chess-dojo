import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Color } from '@lichess-org/chessground/types';
import { Stack } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'react-resizable/css/styles.css';
import { onInitializeFunc } from '../Board';
import KeyboardHandler from './KeyboardHandler';
import ResizableBoardArea from './ResizableBoardArea';
import Underboard, { UnderboardApi } from './boardTools/underboard/Underboard';
import { DefaultUnderboardTab, UnderboardTab } from './boardTools/underboard/underboardTabs';
import { PgnTextBanners, ResizablePgnText } from './pgnText/PgnText';
import { AreaSizes, getFittedSizes, getNewSizes, getSizes } from './resize';

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
    pgn,
    fen,
    startOrientation,
    onInitialize,
}) => {
    const underboardRef = useRef<UnderboardApi>(null);
    const hasLeftPanel = underboardTabs.length > 0;
    const hasRightPanel = rightTabs === undefined || rightTabs.length > 0;
    const [leftVisible, setLeftVisible] = useState(true);
    const [rightVisible, setRightVisible] = useState(true);
    const showUnderboard = hasLeftPanel && (!allowPanelHiding || leftVisible);
    const showPgn = hasRightPanel && (!allowPanelHiding || rightVisible);
    const showPanelControls = allowPanelHiding && (hasLeftPanel || hasRightPanel);

    const [sizes, setSizes] = useState<AreaSizes | null>(null);
    const [fittedBase, setFittedBase] = useState<AreaSizes | null>(null);
    const barsHidden = allowPanelHiding && fittedBase !== null;

    const calcSizes = useCallback(() => {
        const parentWidth = getParentWidth();

        // Visibility only changes which panels occupy the layout, not their saved dimensions.
        return getSizes(parentWidth, hasLeftPanel, !showPlayerHeaders, {
            showPgn: hasRightPanel,
            showPanelControls,
        });
    }, [hasLeftPanel, showPlayerHeaders, hasRightPanel, showPanelControls]);

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
                return getNewSizes(
                    {
                        ...sizes,
                        [area]: { ...sizes[area], width, height },
                    },
                    !showPlayerHeaders,
                    { showPgn: hasRightPanel, showPanelControls },
                );
            });
        },
        [setSizes, calcSizes, showPlayerHeaders, hasRightPanel, showPanelControls, barsHidden],
    );

    if (!sizes) {
        return null;
    }

    const displayedSizes = barsHidden
        ? getFittedSizes(fittedBase, getParentWidth(), showUnderboard, showPgn)
        : sizes;

    return (
        <Stack
            direction='row'
            spacing={{ xs: 0, sm: 0 }}
            sx={{
                width: 1,
                maxWidth: 1,
                justifyContent: 'center',
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
                    resizeData: displayedSizes.board,
                    onResize: onResize('board'),
                    hideResize: barsHidden || sizes.breakpoint === 'xs',
                    barsHidden,
                    onToggleBars: allowPanelHiding
                        ? () => setFittedBase((current) => (current ? null : sizes))
                        : undefined,
                    showPlayerHeaders,
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

            {rightTabs ? (
                <Underboard
                    hidden={!showPgn}
                    onReveal={() => setRightVisible(true)}
                    tabs={rightTabs}
                    initialTab={initialRightTab}
                    resizeData={displayedSizes.pgn}
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
                    resizeData={displayedSizes.pgn}
                    onResize={onResize('pgn')}
                />
            )}
        </Stack>
    );
};

export default ResizableContainer;
