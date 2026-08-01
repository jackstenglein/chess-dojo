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
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { GraduationDialog } from '../GraduationDialog';
import { TrainingPlanContext } from '../TrainingPlanTab';

export function GraduationTask() {
    const t = useTranslations('profile.trainingPlan.graduationTask');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tRating = useTranslations('enums.ratingSystem');
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
                            <Stack
                                spacing={1}
                                sx={{
                                    alignItems: 'start',
                                }}
                            >
                                <CohortIcon cohort={user.dojoCohort} tooltip='' size={24} />

                                <Typography
                                    variant='h6'
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {t('title', { cohort: user.dojoCohort })}
                                </Typography>
                            </Stack>

                            <Typography color='textSecondary' sx={{ mt: 1 }}>
                                {isCustom(user.ratingSystem) && ratingSystemName
                                    ? t('descriptionWithName', {
                                          rating: getCurrentRating(user),
                                          system: formatRatingSystem(user.ratingSystem, tRating),
                                          name: ratingSystemName,
                                      })
                                    : t('descriptionBase', {
                                          rating: getCurrentRating(user),
                                          system: formatRatingSystem(user.ratingSystem, tRating),
                                      })}
                            </Typography>
                        </CardContent>
                    </CardActionArea>
                    <CardActions disableSpacing>
                        <Tooltip title={tCommon('viewTaskDetails')}>
                            <IconButton sx={{ color: 'text.secondary' }} onClick={onOpen}>
                                <Help />
                            </IconButton>
                        </Tooltip>

                        {isCurrentUser && (
                            <Tooltip title={tCommon('skipForWeek')}>
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
