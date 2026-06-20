'use client';

import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import Icon from '@/style/Icon';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Tab } from '@mui/material';
import { useTranslations } from 'next-intl';
import InfoTab from './InfoTab';
import LeaderboardTab from './LeaderboardTab';

export default function TournamentsPage() {
    const { searchParams, setSearchParams } = useNextSearchParams({ type: 'leaderboard' });
    const t = useTranslations('tournaments.liga.tabs');

    return (
        <TabContext value={searchParams.get('type') || 'calendar'}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList
                    data-testid='tournaments-tab-list'
                    onChange={(_, tab: string) => setSearchParams({ type: tab })}
                    variant='scrollable'
                >
                    {/* <Tab
                        label={t('calendar')}
                        value='calendar'
                        icon={<Icon name='ligaCalendar' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    /> */}
                    <Tab
                        label={t('leaderboard')}
                        value='leaderboard'
                        icon={<Icon name='leaderboard' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                    <Tab
                        label={t('info')}
                        value='info'
                        icon={<Icon name='info' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                </TabList>
            </Box>

            {/* <TabPanel value='calendar' sx={{ px: 0 }}>
                <CalendarTab />
            </TabPanel> */}

            <TabPanel value='leaderboard' sx={{ px: 0 }}>
                <LeaderboardTab />
            </TabPanel>

            <TabPanel value='info' sx={{ px: 0 }}>
                <InfoTab />
            </TabPanel>
        </TabContext>
    );
}
