import { User } from '@/database/user';
import { useWindowSizeEffect } from '@/style/useWindowSizeEffect';
import { Grid, useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Heatmap } from '../info/Heatmap';
import { getBlockSize, MIN_BLOCK_SIZE } from '../info/HeatmapCard';
import ActivityPieChart from './ActivityPieChart';
import ActivityTimeline from './ActivityTimeline';
import { useTimelineContext } from './useTimeline';

interface ActivityTabProps {
    user: User;
}

const ActivityTab: React.FC<ActivityTabProps> = ({ user }) => {
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('lg'));

    const timeline = useTimelineContext();
    const [blockSize, setBlockSize] = useState(MIN_BLOCK_SIZE);

    const resizeDialogBlocks = useCallback(() => {
        setBlockSize(getBlockSize());
    }, [setBlockSize]);

    useEffect(resizeDialogBlocks, [resizeDialogBlocks]);
    useWindowSizeEffect(resizeDialogBlocks);

    return (
        <Grid container justifyContent='space-between' rowSpacing={5}>
            {isSmall && (
                <Grid size={12}>
                    <Heatmap
                        entries={timeline.entries}
                        blockSize={blockSize}
                        description='in the past year'
                        slotProps={{
                            weekdayLabelPaper: {
                                elevation: 0,
                            },
                        }}
                        workGoalHistory={user.workGoalHistory ?? []}
                    />
                </Grid>
            )}
            <Grid size={12} sx={{ mt: 4 }}>
                <ActivityPieChart user={user} timeline={timeline} />
            </Grid>
            <Grid size={12} sx={{ mt: 4 }}>
                <ActivityTimeline user={user} timeline={timeline} />
            </Grid>
        </Grid>
    );
};

export default ActivityTab;
