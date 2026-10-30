import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { WorkGoalHistory } from '@/database/user';
import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Close } from '@mui/icons-material';
import { Card, CardContent, Dialog, DialogContent, IconButton } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Heatmap } from './Heatmap';
import { YearlyTotals } from './YearlyTotals';

const BLOCK_COLUMNS = 54;
const BLOCK_MARGIN = 4;
const DIALOG_PADDING = 124;
const LABEL_WIDTH = 30;
export const MIN_BLOCK_SIZE = 12;

export function getBlockSize() {
    const parentWidth = document.getElementsByTagName('html')[0]?.getBoundingClientRect().width;
    if (!parentWidth) {
        return MIN_BLOCK_SIZE;
    }

    let newBlockSize =
        parentWidth - DIALOG_PADDING - (BLOCK_COLUMNS - 1) * BLOCK_MARGIN - LABEL_WIDTH;
    newBlockSize = newBlockSize / BLOCK_COLUMNS;

    return Math.max(MIN_BLOCK_SIZE, newBlockSize);
}

/**
 * Renders a card showing the user's activity heatmap.
 * @param workGoalHistory The work goal history of the user.
 */
export const HeatmapCard = ({ workGoalHistory }: { workGoalHistory: WorkGoalHistory[] }) => {
    const { entries, owner } = useTimelineContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [blockSize, setBlockSize] = useState(MIN_BLOCK_SIZE);
    const t = useTranslations('profile.info');
    const tHeatmap = useTranslations('profile.info.heatmap');

    const resizeDialogBlocks = useCallback(() => {
        if (isModalOpen) {
            setBlockSize(getBlockSize());
        }
    }, [isModalOpen, setBlockSize]);

    useEffect(resizeDialogBlocks, [resizeDialogBlocks]);
    useWindowSizeEffect(resizeDialogBlocks);

    /**
     * Expands the heatmap when the card is clicked anywhere but a day square (which
     * shows that day's tasks) or a button.
     */
    const onClickCard = (event: MouseEvent<HTMLDivElement>) => {
        const target = event.target as Element;
        if (
            // Clicks in menus and popups are portalled outside but still bubble here.
            !event.currentTarget.contains(target) ||
            target.closest('button, a, [data-activity-date]')
        ) {
            return;
        }
        setIsModalOpen(true);
    };

    return (
        <>
            <Card onClick={onClickCard} sx={{ height: 1, cursor: 'pointer' }}>
                <CardContent sx={{ position: 'relative', '&:last-child': { pb: 2 } }}>
                    <Heatmap
                        entries={entries}
                        description={t('pastYear')}
                        title={tHeatmap('title')}
                        workGoalHistory={workGoalHistory}
                    />
                </CardContent>
            </Card>

            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth={false}
                fullWidth
                slotProps={{
                    paper: {
                        elevation: 1,
                    },
                }}
            >
                <IconButton
                    aria-label={t('close')}
                    onClick={() => setIsModalOpen(false)}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <Close />
                </IconButton>

                <DialogContent
                    sx={{
                        // Room for the close button, so it doesn't crowd the heatmap's
                        // own info, settings and expand icons.
                        pt: 7,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <Heatmap
                        entries={entries}
                        blockSize={blockSize}
                        description={t('pastYear')}
                        title={tHeatmap('title')}
                        workGoalHistory={workGoalHistory}
                    />
                    <YearlyTotals owner={owner} />
                </DialogContent>
            </Dialog>
        </>
    );
};
