import { SolitaireAfterPgnText } from '@/board/pgn/solitaire/SolitaireAfterPgnText';
import { UnpublishedGameBanner } from '@/components/games/edit/UnpublishedGameBanner';
import { UnsavedGameBanner } from '@/components/games/edit/UnsavedGameBanner';
import useGame from '@/context/useGame';
import { useLightMode } from '@/style/useLightMode';
import { Card, Stack } from '@mui/material';
import React, { useMemo, useRef } from 'react';
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
        <Stack spacing={1} maxHeight={1}>
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
    resizeData: ResizableData;
    onResize: (width: number, height: number) => void;
}

export const ResizablePgnText: React.FC<ResizablePgnTextProps> = (props) => {
    const { resizeData, onResize } = props;
    const { chess } = useChess();

    const handleResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
        onResize(data.size.width, data.size.height);
    };

    const Pgn = useMemo(() => <PgnText />, []);

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
                sx={{
                    mb: { xs: 1, md: 0 },
                    width: `${resizeData.width}px`,
                    maxHeight: `${resizeData.height}px`,
                    visibility: chess ? undefined : 'hidden',
                }}
            >
                {Pgn}
            </Stack>
        </Resizable>
    );
};

export default PgnText;
