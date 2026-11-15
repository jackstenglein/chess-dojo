import { useFreeTier } from '@/auth/Auth';
import { formatRatingSystem, getCurrentRating, shouldPromptGraduation } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { Help, NotInterested, School } from '@mui/icons-material';
import {
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { GraduationDialog } from '../GraduationDialog';
import { GRADUATION_SKIP_ID } from '../skippedTasks';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { dailyCardActionsSx, dailyCardSx, dailyPrimaryButtonSx } from './DailyCard';
import { DailyTaskMenu, DailyTaskMenuAction } from './DailyTaskMenu';

export function GraduationTask() {
    const t = useTranslations('profile.trainingPlan.graduationTask');
    const tGraduation = useTranslations('profile.trainingPlan.graduation');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tRating = useTranslations('enums.ratingSystem');
    const { user, isCurrentUser, skippedTaskIds, toggleSkip } = use(TrainingPlanContext);
    const shouldGraduate = shouldPromptGraduation(user);

    const isFreeTier = useFreeTier();
    const [upsellDialogOpen, setUpsellDialogOpen] = useState(false);
    const [showGraduationDialog, setShowGraduationDialog] = useState(false);

    if (!shouldGraduate || skippedTaskIds?.includes(GRADUATION_SKIP_ID)) {
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

    const menuActions: DailyTaskMenuAction[] = [
        {
            key: 'details',
            label: tCommon('viewTaskDetails'),
            icon: <Help fontSize='small' />,
            onClick: onOpen,
        },
    ];
    if (isCurrentUser) {
        menuActions.push({
            key: 'skip',
            label: tCommon('skipForWeek'),
            icon: <NotInterested fontSize='small' />,
            onClick: () => toggleSkip(GRADUATION_SKIP_ID),
        });
    }

    return (
        <>
            <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined' sx={dailyCardSx(false)}>
                    <DailyTaskMenu actions={menuActions} />

                    <CardActionArea sx={{ flexGrow: 1, borderRadius: 'inherit' }} onClick={onOpen}>
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
                    <CardActions disableSpacing sx={dailyCardActionsSx}>
                        <Button
                            size='small'
                            variant='contained'
                            disableElevation
                            startIcon={<School />}
                            onClick={onOpen}
                            sx={dailyPrimaryButtonSx}
                            data-testid='graduate-button'
                        >
                            {tGraduation('graduate')}
                        </Button>
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
