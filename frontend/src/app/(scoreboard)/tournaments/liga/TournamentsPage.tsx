'use client';

import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import Icon from '@/style/Icon';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Tab } from '@mui/material';
import CalendarTab from './CalendarTab';
import InfoTab from './InfoTab';
import LeaderboardTab from './LeaderboardTab';

export default function TournamentsPage() {
    const { searchParams, setSearchParams } = useNextSearchParams({ type: 'calendar' });

    return (
        <TabContext value={searchParams.get('type') || 'calendar'}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList
                    data-testid='tournaments-tab-list'
                    onChange={(_, t: string) => setSearchParams({ type: t })}
                    variant='scrollable'
                >
                    <Tab
                        label='Calendar'
                        value='calendar'
                        icon={<Icon name='ligaCalendar' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                    <Tab
                        label='Leaderboard'
                        value='leaderboard'
                        icon={<Icon name='leaderboard' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                    <Tab
                        label='Info'
                        value='info'
                        icon={<Icon name='info' color='primary' />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                </TabList>
            </Box>

            <TabPanel value='calendar' sx={{ px: 0 }}>
                <CalendarTab />
            </TabPanel>

            <TabPanel value='leaderboard' sx={{ px: 0 }}>
                <LeaderboardTab />
            </TabPanel>

            <TabPanel value='info' sx={{ px: 0 }}>
                <InfoTab />
            </TabPanel>
        </TabContext>
    );
}
