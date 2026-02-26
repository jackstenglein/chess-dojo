import { useFreeTier } from '@/auth/Auth';
import { formatRatingSystem, getCurrentRating, shouldPromptGraduation } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { Help, NotInterested } from '@mui/icons-material';
import {
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Grid,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { use, useState } from 'react';
import { GraduationDialog } from '../GraduationDialog';
import { TrainingPlanContext } from '../TrainingPlanTab';

export function GraduationTask() {
    const { user, isCurrentUser, skippedTaskIds, toggleSkip } = use(TrainingPlanContext);
    const shouldGraduate = shouldPromptGraduation(user);

    const isFreeTier = useFreeTier();
    const [upsellDialogOpen, setUpsellDialogOpen] = useState(false);
    const [showGraduationDialog, setShowGraduationDialog] = useState(false);

    if (!shouldGraduate || skippedTaskIds?.includes('graduation')) {
        return null;
    }

    const ratingSystemName = user.ratings[user.ratingSystem]?.name;

    const onOpen = () => {
        if (isFreeTier) {
            setUpsellDialogOpen(true);
        } else {
            setShowGraduationDialog(true);
        }
    };

    return (
        <>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card
                    variant='outlined'
                    sx={{ height: 1, display: 'flex', flexDirection: 'column' }}
                >
                    <CardActionArea sx={{ flexGrow: 1 }} onClick={onOpen}>
                        <CardContent sx={{ height: 1 }}>
                            <Stack spacing={1} alignItems='start'>
                                <CohortIcon cohort={user.dojoCohort} tooltip='' size={24} />

                                <Typography variant='h6' fontWeight='bold'>
                                    Graduate from {user.dojoCohort}
                                </Typography>
                            </Stack>

                            <Typography color='textSecondary' sx={{ mt: 1 }}>
                                Congrats on reaching {getCurrentRating(user)}{' '}
                                {formatRatingSystem(user.ratingSystem)}
                                {isCustom(user.ratingSystem) &&
                                    ratingSystemName &&
                                    ` (${ratingSystemName})`}
                                ! Use this task to move to the next cohort, add a badge to your
                                profile, and get one of your annotated games reviewed on stream!
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                    <CardActions disableSpacing>
                        <Tooltip title='View task details'>
                            <IconButton sx={{ color: 'text.secondary' }} onClick={onOpen}>
                                <Help />
                            </IconButton>
                        </Tooltip>

                        {isCurrentUser && (
                            <Tooltip title='Skip for the rest of the week'>
                                <IconButton
                                    sx={{
                                        color: 'text.secondary',
                                        marginLeft: 'auto',
                                    }}
                                    onClick={() => toggleSkip('graduation')}
                                >
                                    <NotInterested />
                                </IconButton>
                            </Tooltip>
                        )}
                    </CardActions>
                </Card>
            </Grid>

            <GraduationDialog
                open={showGraduationDialog}
                onClose={() => setShowGraduationDialog(false)}
                user={user}
            />
            <UpsellDialog
                open={upsellDialogOpen}
                onClose={setUpsellDialogOpen}
                currentAction={RestrictedAction.Graduate}
            />
        </>
    );
}
