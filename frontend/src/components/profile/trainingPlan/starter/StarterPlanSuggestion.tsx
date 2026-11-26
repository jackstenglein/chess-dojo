'use client';

import { useApi } from '@/api/Api';
import { RequestStatus, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import {
    isRequirementAvailableForSubscriptionTier,
    RequirementCategory,
} from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { School } from '@mui/icons-material';
import { Button, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { isStarterPlanSuggested } from './starterPlan';
import { withStarterPlanStarted } from './starterProgress';

/**
 * Offers the starter plan to an existing member who has been away for over a month and
 * done little of their program: "New to Dojo? Start here". Starting it swaps the
 * training plan for the starter plan; tasks the member already did count as done.
 */
export function StarterPlanSuggestion({ force = false }: { force?: boolean }) {
    const t = useTranslations('profile.trainingPlan.starter.suggestion');
    const { user, updateUser } = useAuth();
    const api = useApi();
    const request = useRequest();
    const { requirements, isCurrentUser } = use(TrainingPlanContext);
    const { entries: timeline, request: timelineRequest, hasMore } = useTimelineContext();

    if (!user || !isCurrentUser) {
        return null;
    }
    // Wait for the whole timeline, so an active member isn't briefly taken as inactive.
    const timelineLoaded = timelineRequest.status === RequestStatus.Success && !hasMore;
    const tier = getSubscriptionTier(user);
    const available = requirements.filter((r) =>
        isRequirementAvailableForSubscriptionTier(r, tier),
    );
    const suggested =
        force ||
        (timelineLoaded && isStarterPlanSuggested({ user, requirements: available, timeline }));
    if (!suggested) {
        return null;
    }

    const onStart = async () => {
        const tutorials = withStarterPlanStarted(user.tutorials);
        request.onStart();
        try {
            await api.updateUser({ tutorials });
            updateUser({ tutorials });
            request.onSuccess();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const color = CategoryColors[RequirementCategory.Welcome];

    return (
        <Card
            variant='outlined'
            data-testid='starter-plan-suggestion'
            sx={{
                width: 1,
                borderRadius: 3,
                borderColor: `${color}66`,
                background: `linear-gradient(135deg, ${color}1f 0%, transparent 60%)`,
            }}
        >
            {/* The whole banner starts the plan; the button inside only shows where to click. */}
            <CardActionArea
                disabled={request.isLoading()}
                onClick={() => void onStart()}
                sx={{ borderRadius: 'inherit' }}
            >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{ alignItems: { xs: 'start', sm: 'center' }, gap: 2 }}
                    >
                        <School sx={{ fontSize: '2.25rem', color }} />
                        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                {t('title')}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {t('description')}
                            </Typography>
                        </Stack>
                        <Button
                            component='span'
                            variant='contained'
                            disableElevation
                            loading={request.isLoading()}
                            tabIndex={-1}
                            sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
                        >
                            {t('start')}
                        </Button>
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
