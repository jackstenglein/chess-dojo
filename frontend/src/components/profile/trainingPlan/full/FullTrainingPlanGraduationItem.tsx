'use client';

import { useFreeTier } from '@/auth/Auth';
import { Requirement } from '@/database/requirement';
import {
    dojoCohorts,
    formatRatingSystem,
    getCurrentRating,
    getMinRatingBoundary,
    getRatingBoundary,
    shouldPromptGraduation,
    User,
} from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import ScoreboardProgress from '@/scoreboard/ScoreboardProgress';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { isCustom } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { Lock } from '@mui/icons-material';
import { Box, Divider, Grid, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { GraduationDialog } from '../GraduationDialog';

interface FullTrainingPlanGraduationItemProps {
    requirement: Requirement;
    user: User;
    cohort: string;
    isCurrentUser: boolean;
}

export function FullTrainingPlanGraduationItem({
    requirement,
    user,
    cohort,
    isCurrentUser,
}: FullTrainingPlanGraduationItemProps) {
    const isFreeTier = useFreeTier();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [upsellOpen, setUpsellOpen] = useState(false);

    const canGraduate = shouldPromptGraduation(user);
    const disabled = !canGraduate;

    const currentRating = getCurrentRating(user);
    const minRatingBoundary = getMinRatingBoundary(cohort, user.ratingSystem);
    const graduationBoundary = getRatingBoundary(cohort, user.ratingSystem);
    const showRatingProgress =
        graduationBoundary != null &&
        graduationBoundary > 0 &&
        minRatingBoundary != null &&
        currentRating >= 0;

    const ratingSystemName = user.ratings[user.ratingSystem]?.name;

    const onOpen = () => {
        if (disabled) return;
        if (isFreeTier) {
            setUpsellOpen(true);
        } else {
            setDialogOpen(true);
        }
    };

    return (
        <>
            <Tooltip
                title={
                    disabled ? 'Reach the required rating for your cohort to unlock graduation' : ''
                }
                followCursor
            >
                <Stack spacing={2} mt={2}>
                    <Grid
                        container
                        columnGap={0.5}
                        alignItems='center'
                        justifyContent='space-between'
                        onClick={isCurrentUser && !disabled ? onOpen : undefined}
                        sx={{
                            cursor: isCurrentUser && !disabled ? 'pointer' : 'default',
                            opacity: disabled ? 0.6 : 1,
                        }}
                    >
                        <Grid size={9} display='flex' flexDirection='column' rowGap='0.25rem'>
                            <Stack direction='row' alignItems='center' spacing={1}>
                                {disabled && (
                                    <Lock sx={{ color: 'text.secondary', fontSize: 20 }} />
                                )}
                                <Typography fontWeight='bold'>{requirement.name}</Typography>
                            </Stack>
                            {showRatingProgress &&
                                (() => {
                                    const nextCohort = dojoCohorts[dojoCohorts.indexOf(cohort) + 1];
                                    return (
                                        <Stack width={1}>
                                            <Stack direction='row' alignItems='center' gap={0.5}>
                                                <RatingSystemIcon
                                                    system={user.ratingSystem}
                                                    size='small'
                                                />
                                                <Typography
                                                    variant='body2'
                                                    color='text.secondary'
                                                    sx={{ fontWeight: 'bold' }}
                                                >
                                                    {formatRatingSystem(user.ratingSystem)}
                                                    {isCustom(user.ratingSystem) &&
                                                        ratingSystemName &&
                                                        ` (${ratingSystemName})`}
                                                </Typography>
                                            </Stack>
                                            <Stack direction='row' alignItems='center' gap={0.5}>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <ScoreboardProgress
                                                        value={currentRating}
                                                        min={minRatingBoundary}
                                                        max={graduationBoundary}
                                                        label={`${currentRating} / ${graduationBoundary}`}
                                                        sx={{
                                                            height: '6px',
                                                            borderRadius: '2px',
                                                        }}
                                                    />
                                                </Box>
                                                {nextCohort && (
                                                    <CohortIcon
                                                        cohort={nextCohort}
                                                        tooltip={
                                                            disabled
                                                                ? ''
                                                                : `Next graduation: from ${cohort} to ${nextCohort}`
                                                        }
                                                        size={20}
                                                        sx={{ marginTop: '-3px' }}
                                                    />
                                                )}
                                            </Stack>
                                        </Stack>
                                    );
                                })()}
                        </Grid>
                    </Grid>
                    <Divider />
                </Stack>
            </Tooltip>

            <GraduationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} user={user} />
            <UpsellDialog
                open={upsellOpen}
                onClose={setUpsellOpen}
                currentAction={RestrictedAction.Graduate}
            />
        </>
    );
}
