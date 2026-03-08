'use client';

import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { SwitchCohortPrompt } from '@/components/profile/SwitchCohortPrompt';
import ActivityTab from '@/components/profile/activity/ActivityTab';
import { TimelineProvider } from '@/components/profile/activity/useTimeline';
import { DirectoriesSection } from '@/components/profile/directories/DirectoriesSection';
import { DirectoryCacheProvider } from '@/components/profile/directories/DirectoryCache';
import { BadgeCard } from '@/components/profile/info/BadgeCard';
import DojoScoreCard from '@/components/profile/info/DojoScoreCard';
import { HeatmapCard } from '@/components/profile/info/HeatmapCard';
import { NewsfeedCard } from '@/components/profile/info/NewsfeedCard';
import { UserCard } from '@/components/profile/info/UserCard';
import { LiveClassesTab } from '@/components/profile/liveClasses/LiveClassesTab';
import StatsTab from '@/components/profile/stats/StatsTab';
import { TrainingPlanTab } from '@/components/profile/trainingPlan/TrainingPlanTab';
import { hasCreatedProfile, User } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import ClubsTab from '@/profile/clubs/ClubsTab';
import CoachTab from '@/profile/coach/CoachTab';
import ProfileCreatorPage from '@/profile/creator/ProfileCreatorPage';
import { PawnIcon } from '@/style/ChessIcons';
import { PresenterIcon } from '@/style/PresenterIcon';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { Groups, PieChart, RocketLaunch, Star, Timeline } from '@mui/icons-material';
import { TabContext, TabPanel } from '@mui/lab';
import { Box, Chip, Container, Stack, Tab, Tabs, useMediaQuery } from '@mui/material';
import { ReactNode, useEffect, type JSX } from 'react';

export function ProfilePage({ username }: { username?: string }) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (!user) {
        return <NotFoundPage />;
    }
    return <AuthProfilePage currentUser={user} username={username} />;
}

function AuthProfilePage({ currentUser, username }: { currentUser: User; username?: string }) {
    const api = useApi();
    const request = useRequest<User>();
    const isSmall = useMediaQuery((theme) => theme.breakpoints.down('md'));
    const isLarge = useMediaQuery((theme) => theme.breakpoints.up('lg'));

    const currentUserProfile = !username || username === currentUser?.username;

    const { searchParams, updateSearchParams } = useNextSearchParams(
        currentUserProfile ? { view: 'progress' } : { view: 'stats' },
    );

    const isFiles = searchParams.get('view') === 'files';
    useEffect(() => {
        if (isFiles) {
            updateSearchParams({ view: 'games' });
        }
    }, [isFiles, updateSearchParams]);

    useEffect(() => {
        if (!currentUserProfile && !request.isSent()) {
            request.onStart();
            api.getUserPublic(username)
                .then((response) => {
                    request.onSuccess(response.data);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    }, [api, currentUserProfile, request, username]);

    const user = currentUserProfile ? currentUser : request.data;

    if (currentUserProfile && !hasCreatedProfile(currentUser)) {
        return <ProfileCreatorPage />;
    }

    if (!user && (!request.isSent() || request.isLoading())) {
        return <LoadingPage />;
    } else if (!user) {
        return <NotFoundPage />;
    }

    const setFollowerCount = (count: number) => {
        request.onSuccess({
            ...user,
            followerCount: count,
        });
    };

    return (
        <Container
            maxWidth={false}
            sx={{
                py: 6,
                display: 'grid',
                gridTemplateAreas: {
                    xs: `"userInfo"
                         "profile"
                         "newsfeed"`,
                    sm: `"userInfo scorecard"
                         "profile profile"
                         "newsfeed newsfeed"`,
                    md: `"userInfo heatmap"
                         "profile profile"
                         "newsfeed newsfeed"`,
                    lg: `"userInfo  profile"
                         "heatmap   profile"
                         "scorecard profile"
                         "badges    profile"
                         "newsfeed  profile"
                         ".         profile"`,
                },
                gridTemplateColumns: {
                    xs: '100%',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: '350px minmax(750px, 1fr)',
                    xl: 'minmax(350px, 400px) minmax(750px, 1500px)',
                },
                gridTemplateRows: {
                    lg: 'auto auto auto auto auto 1fr',
                },
                gridAutoColumns: 0,
                columnGap: 2,
                rowGap: 2,
                '@media (min-width:2250px)': {
                    gridTemplateAreas: `"userInfo  profile heatmap"
                                        "userInfo  profile badges"
                                        "scorecard profile badges"
                                        "newsfeed  profile ."
                                        ".         profile ."`,
                    gridTemplateColumns:
                        'minmax(350px, 400px) minmax(750px, 1500px) minmax(350px, 400px)',
                    gridTemplateRows: 'auto auto auto auto 1fr',
                    columnGap: 4,
                },
            }}
        >
            <TimelineProvider owner={user.username}>
                <Box sx={{ gridArea: 'profile', width: '100%', typography: 'body1' }}>
                    <TabContext value={searchParams.get('view') || 'stats'}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs
                                value={searchParams.get('view') || 'stats'}
                                onChange={(_, t: string) => updateSearchParams({ view: t })}
                                aria-label='profile tabs'
                                variant='scrollable'
                            >
                                {(getSubscriptionTier(user) === SubscriptionTier.GameReview ||
                                    getSubscriptionTier(user) === SubscriptionTier.Lecture) && (
                                    <ProfileTab
                                        label={
                                            <Stack direction='row' alignItems='center'>
                                                Live Classes
                                                <Chip
                                                    label='New'
                                                    color='success'
                                                    size='small'
                                                    sx={{ ml: 1 }}
                                                />
                                            </Stack>
                                        }
                                        value='classes'
                                        icon={<PresenterIcon fontSize='small' />}
                                    />
                                )}
                                <ProfileTab
                                    label='Ratings'
                                    value='stats'
                                    icon={<Timeline fontSize='small' />}
                                />
                                {user.isCoach && (
                                    <ProfileTab
                                        label='Coaching'
                                        value='coaching'
                                        icon={<RocketLaunch fontSize='small' />}
                                    />
                                )}
                                <ProfileTab
                                    id='training-plan-tab'
                                    label='Training Plan'
                                    value='progress'
                                    icon={<Star fontSize='small' />}
                                />
                                <ProfileTab
                                    label='Activity'
                                    value='activity'
                                    icon={<PieChart fontSize='small' />}
                                />
                                <ProfileTab
                                    label='Games'
                                    value='games'
                                    icon={<PawnIcon fontSize='small' />}
                                />
                                <ProfileTab
                                    label='Clubs'
                                    value='clubs'
                                    icon={<Groups fontSize='small' />}
                                />
                            </Tabs>
                        </Box>
                        <TabPanel value='classes' sx={{ px: 0, pl: { lg: 1 } }}>
                            <LiveClassesTab user={user} />
                        </TabPanel>
                        <TabPanel value='stats' sx={{ px: 0, pl: { lg: 1 } }}>
                            <StatsTab user={user} />
                        </TabPanel>
                        <TabPanel value='coaching' sx={{ px: 0, pl: { lg: 1 } }}>
                            <CoachTab user={user} />
                        </TabPanel>
                        <TabPanel value='progress' sx={{ px: { xs: 0 }, pl: { lg: 1 } }}>
                            <TrainingPlanTab user={user} />
                        </TabPanel>
                        <TabPanel value='activity' sx={{ px: 0, pl: { lg: 1 } }}>
                            <ActivityTab user={user} />
                        </TabPanel>
                        <TabPanel value='games' sx={{ px: 0 }}>
                            <DirectoryCacheProvider>
                                <DirectoriesSection
                                    namespace={currentUserProfile ? 'own-profile' : 'other-profile'}
                                    defaultDirectoryOwner={user.username}
                                    enableNavigationMenu={currentUserProfile}
                                    defaultNavigationMenuOpen={true}
                                    defaultColumnVisibility={{
                                        type: true,
                                        name: true,
                                        result: true,
                                        owner: true,
                                        createdAt: true,
                                    }}
                                />
                            </DirectoryCacheProvider>
                        </TabPanel>
                        <TabPanel value='clubs' sx={{ px: 0, pl: { lg: 1 } }}>
                            <ClubsTab user={user} />
                        </TabPanel>
                    </TabContext>
                </Box>

                {currentUserProfile && <SwitchCohortPrompt />}

                <Box sx={{ gridArea: 'userInfo' }}>
                    <UserCard user={user} setFollowerCount={setFollowerCount} />
                </Box>

                {!isSmall && (
                    <Box sx={{ gridArea: 'heatmap', display: { xs: 'none', md: 'initial' } }}>
                        <HeatmapCard workGoalHistory={user.workGoalHistory ?? []} />
                    </Box>
                )}

                {(isSmall || isLarge) && (
                    <Box sx={{ gridArea: 'scorecard' }}>
                        <DojoScoreCard user={user} cohort={user.dojoCohort} />
                    </Box>
                )}

                {isLarge && (
                    <Box sx={{ gridArea: 'badges', display: { xs: 'none', lg: 'initial' } }}>
                        <BadgeCard user={user} />
                    </Box>
                )}

                {currentUserProfile && (
                    <Box sx={{ gridArea: 'newsfeed' }}>
                        <NewsfeedCard />
                    </Box>
                )}
            </TimelineProvider>
        </Container>
    );
}

function ProfileTab({
    label,
    value,
    icon,
    ...others
}: {
    label: ReactNode;
    value: string;
    icon: JSX.Element;
    [key: string]: string | JSX.Element | ReactNode;
}) {
    return (
        <Tab
            {...others}
            label={label}
            value={value}
            icon={icon}
            iconPosition='start'
            sx={{ minHeight: '48px' }}
        />
    );
}
