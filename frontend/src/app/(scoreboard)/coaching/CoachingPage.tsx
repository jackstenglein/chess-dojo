'use client';

import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { TabContext, TabPanel } from '@mui/lab';
import { Box, Container, Tab, Tabs } from '@mui/material';
import { useTranslations } from 'next-intl';
import CoachesTab from './CoachesTab';
import UpcomingSessions from './UpcomingSessions';

const CoachingPage = () => {
    const t = useTranslations('coaching.tabs');
    const { searchParams, setSearchParams } = useNextSearchParams({ view: 'coaches' });

    return (
        <Container>
            <TabContext value={searchParams.get('view') || 'coaches'}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={searchParams.get('view') || 'coaches'}
                        onChange={(_, tab: string) => setSearchParams({ view: tab })}
                        variant='scrollable'
                    >
                        <Tab label={t('coaches')} value='coaches' />
                        <Tab label={t('upcomingSessions')} value='sessions' />
                    </Tabs>
                </Box>
                <TabPanel value='coaches'>
                    <CoachesTab />
                </TabPanel>
                <TabPanel value='sessions'>
                    <UpcomingSessions />
                </TabPanel>
            </TabContext>
        </Container>
    );
};

export default CoachingPage;
