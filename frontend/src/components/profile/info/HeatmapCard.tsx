import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { WorkGoalHistory } from '@/database/user';
import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Close } from '@mui/icons-material';
import { Card, CardContent, Dialog, DialogContent, IconButton } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Heatmap } from './Heatmap';

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
    const { entries } = useTimelineContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [blockSize, setBlockSize] = useState(MIN_BLOCK_SIZE);

    const resizeDialogBlocks = useCallback(() => {
        if (isModalOpen) {
            setBlockSize(getBlockSize());
        }
    }, [isModalOpen, setBlockSize]);

    useEffect(resizeDialogBlocks, [resizeDialogBlocks]);
    useWindowSizeEffect(resizeDialogBlocks);

    return (
        <>
            <Card sx={{ height: 1 }}>
                <CardContent sx={{ position: 'relative' }}>
                    <Heatmap
                        entries={entries}
                        onPopOut={() => setIsModalOpen(true)}
                        description=''
                        workGoalHistory={workGoalHistory}
                    />
                </CardContent>
            </Card>

            <Dialog
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth={false}
                fullWidth
                PaperProps={{
                    elevation: 1,
                }}
            >
                <IconButton
                    aria-label='close'
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
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Heatmap
                        entries={entries}
                        blockSize={blockSize}
                        description='in the past year'
                        workGoalHistory={workGoalHistory}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
};
