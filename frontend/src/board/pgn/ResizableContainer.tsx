import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Stack } from '@mui/material';
import { Color } from 'chessground/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import 'react-resizable/css/styles.css';
import { onInitializeFunc } from '../Board';
import KeyboardHandler from './KeyboardHandler';
import ResizableBoardArea from './ResizableBoardArea';
import Underboard, { UnderboardApi } from './boardTools/underboard/Underboard';
import { DefaultUnderboardTab, UnderboardTab } from './boardTools/underboard/underboardTabs';
import { PgnTextBanners, ResizablePgnText } from './pgnText/PgnText';
import { AreaSizes, getNewSizes, getSizes } from './resize';

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
    const showUnderboard = underboardTabs.length > 0;

    const [sizes, setSizes] = useState<AreaSizes | null>(null);

    const calcSizes = useCallback(() => {
        const parentWidth = getParentWidth();

        return getSizes(parentWidth, showUnderboard, !showPlayerHeaders);
    }, [showUnderboard, showPlayerHeaders]);

    const onWindowResize = useCallback(() => {
        setSizes(calcSizes());
    }, [setSizes, calcSizes]);

    useEffect(() => {
        onWindowResize();
    }, [setSizes, calcSizes, onWindowResize]);

    useWindowSizeEffect(onWindowResize);

    const onResize = useCallback(
        (area: 'board' | 'underboard' | 'pgn') => (width: number, height: number) => {
            setSizes((sizes) => {
                if (!sizes) {
                    sizes = calcSizes();
                }
                return getNewSizes(
                    {
                        ...sizes,
                        [area]: { ...sizes[area], width, height },
                    },
                    !showPlayerHeaders,
                );
            });
        },
        [setSizes, calcSizes, showPlayerHeaders],
    );

    if (!sizes) {
        return null;
    }

    return (
        <Stack
            direction='row'
            width={1}
            maxWidth={1}
            spacing={{ xs: 0, sm: 0 }}
            justifyContent='center'
            px={{ xs: 0, sm: 0 }}
            flexWrap='wrap'
            rowGap={0.5}
            columnGap={{ xs: 0.5, md: 1, lg: 1 }}
        >
            <KeyboardHandler underboardRef={underboardRef} />

            {showUnderboard && (
                <Underboard
                    ref={underboardRef}
                    tabs={underboardTabs}
                    initialTab={initialUnderboardTab}
                    resizeData={sizes.underboard}
                    onResize={onResize('underboard')}
                    storageKey={getPanelStorageKey(tabStorageKeyPrefix, 'left')}
                    explorerStorageKey={getExplorerStorageKey(tabStorageKeyPrefix, 'left')}
                    sidePanelTabs={sidePanelTabs}
                />
            )}

            <ResizableBoardArea
                {...{
                    resizeData: sizes.board,
                    onResize: onResize('board'),
                    hideResize: sizes.breakpoint === 'xs',
                    showPlayerHeaders,
                    pgn,
                    fen,
                    startOrientation,
                    onInitialize,
                    underboardRef,
                }}
            />

            {rightTabs ? (
                <Underboard
                    tabs={rightTabs}
                    initialTab={initialRightTab}
                    resizeData={sizes.pgn}
                    onResize={onResize('pgn')}
                    storageKey={getPanelStorageKey(tabStorageKeyPrefix, 'right')}
                    explorerStorageKey={getExplorerStorageKey(tabStorageKeyPrefix, 'right')}
                    buttonTestIdPrefix='right-'
                    header={<PgnTextBanners />}
                    sidePanelTabs={sidePanelTabs}
                />
            ) : (
                <ResizablePgnText resizeData={sizes.pgn} onResize={onResize('pgn')} />
            )}
        </Stack>
    );
};

export default ResizableContainer;
