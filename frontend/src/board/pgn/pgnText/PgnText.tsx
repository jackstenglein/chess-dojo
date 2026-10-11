import { SolitaireAfterPgnText } from '@/board/pgn/solitaire/SolitaireAfterPgnText';
import { UnpublishedGameBanner } from '@/components/games/edit/UnpublishedGameBanner';
import { UnsavedGameBanner } from '@/components/games/edit/UnsavedGameBanner';
import useGame from '@/context/useGame';
import { useLightMode } from '@/style/useLightMode';
import { Box, Card, Stack } from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { useLocalStorage } from 'usehooks-ts';
import { useChess } from '../PgnBoard';
import ResizeHandle from '../ResizeHandle';
import { SaveAllVariationsButton } from '../boardTools/underboard/comments/SaveAllVariationsButton';
import { HideEngine } from '../boardTools/underboard/settings/ViewerSettings';
import { ResizableData } from '../resize';
import GameComment from './GameComment';
import Result from './Result';
import StartingPositionComments from './StartingPositionComments';
import Variation from './Variation';
import EngineSection from './engine/EngineSection';

const PgnTextBody = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { config, slots, slotProps, solitaire } = useChess();
    const [hideEngine] = useLocalStorage(HideEngine.Key, HideEngine.Default);

    const handleScroll = (child: HTMLElement | null) => {
        const scrollParent = ref.current;
        if (child && scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect();
            const childRect = child.getBoundingClientRect();

            scrollParent.scrollTop =
                childRect.top -
                parentRect.top +
                scrollParent.scrollTop -
                scrollParent.clientHeight / 2;
        }
    };

    return (
        <>
            {slots?.beforePgnText}
            {!config?.disableEngine && !hideEngine && !solitaire?.enabled && <EngineSection />}
            <Stack
                ref={ref}
                sx={{
                    overflowY: 'scroll',
                    overflowX: 'clip',
                    flexGrow: 1,
                    minHeight: 0,
                    width: 1,
                }}
            >
                <GameComment />
                <StartingPositionComments />
                <Variation handleScroll={handleScroll} />
                {!slotProps?.pgnText?.hideResult && !solitaire?.enabled && <Result />}

                {slots?.afterPgnText ? (
                    slots.afterPgnText
                ) : solitaire?.enabled ? (
                    <SolitaireAfterPgnText />
                ) : undefined}
            </Stack>
            {slots?.pgnFooter}
        </>
    );
};

export function PgnTextBanners() {
    const { unsaved, game, isOwner } = useGame();

    return (
        <>
            {game?.unlisted && isOwner && <UnpublishedGameBanner dismissable />}
            {unsaved && <UnsavedGameBanner dismissable />}
            <SaveAllVariationsButton />
        </>
    );
}

export const UnderboardPgnText = () => {
    return (
        <Stack
            data-testid='pgn-text'
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                flexGrow: 1,
            }}
        >
            <PgnTextBody />
        </Stack>
    );
};

const PgnText = () => {
    const light = useLightMode();

    return (
        <Stack
            spacing={1}
            sx={{
                maxHeight: 1,
            }}
        >
            <PgnTextBanners />
            <Card
                data-testid='pgn-text'
                variant={light ? 'outlined' : 'elevation'}
                sx={{ display: 'flex', flexDirection: 'column' }}
            >
                <PgnTextBody />
            </Card>
        </Stack>
    );
};

interface ResizablePgnTextProps {
    hidden?: boolean;
    resizeData: ResizableData;
    onResize: (width: number, height: number) => void;
}

export const ResizablePgnText: React.FC<ResizablePgnTextProps> = (props) => {
    const { resizeData, onResize, hidden } = props;
    const { chess, slots } = useChess();

    const handleResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
        onResize(data.size.width, data.size.height);
    };

    const Pgn = useMemo(() => <PgnText />, []);

    // With a footer, the panel reaches down to the bottom of the window, so the footer sits at the
    // bottom of the screen and the room left in the middle is there for the engine's lines.
    const rootRef = useRef<HTMLDivElement>(null);
    const [roomBelow, setRoomBelow] = useState(0);
    const hasFooter = Boolean(slots?.pgnFooter);
    useEffect(() => {
        if (!hasFooter) return;
        const measure = () => {
            const top = rootRef.current?.getBoundingClientRect().top;
            if (top !== undefined) {
                setRoomBelow(Math.floor(window.innerHeight - (top + window.scrollY) - 16));
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [hasFooter]);
    const panelHeight = Math.max(resizeData.height, hasFooter ? roomBelow : 0);

    return (
        <Resizable
            width={resizeData.width}
            height={resizeData.height}
            minConstraints={[resizeData.minWidth, resizeData.minHeight]}
            maxConstraints={[resizeData.maxWidth, resizeData.maxHeight]}
            onResize={handleResize}
            handle={<ResizeHandle />}
        >
            <Stack
                ref={rootRef}
                sx={{
                    mb: { xs: 1, md: 0 },
                    display: hidden ? 'none' : undefined,
                    width: `${resizeData.width}px`,
                    maxHeight: `${panelHeight}px`,
                    ...(hasFooter ? { height: `${panelHeight}px` } : {}),
                    visibility: chess ? undefined : 'hidden',
                    position: 'relative',
                }}
            >
                {Pgn}
                {slots?.overPgnText && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 1,
                            height: `${panelHeight}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 2,
                        }}
                    >
                        {slots.overPgnText}
                    </Box>
                )}
            </Stack>
        </Resizable>
    );
};

export default PgnText;
