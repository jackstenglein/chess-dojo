'use client';

import { RoundRobinStatuses } from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { History, Info as InfoIcon, TableChart as TableChartIcon } from '@mui/icons-material';
import { Box, Container, Tab, Tabs } from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { Suspense, useState } from 'react';
import { InfoPage } from './InfoPage';
import { TournamentsPage } from './TournamentsPage';

/**
 * Renders a tab panel.
 * @param index the int index value
 * @param value the int value
 * @param children ReactNode children
 */
const TabPanel: React.FC<{
    children?: React.ReactNode;
    index: number;
    value: number;
}> = ({ children, value, index }) => {
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

/**
 * Renders the round robin tournaments page.
 */
export const RoundRobinPage = () => {
    const [tabValue, setTabValue] = useState(1);
    const t = useTranslations('tournaments.roundRobin.tabs');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant='fullWidth'
                    aria-label={t('tabsAriaLabel')}
                >
                    <Tab
                        label={t('info')}
                        icon={<InfoIcon />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                    <Tab
                        label={t('tournaments')}
                        icon={<TableChartIcon />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                    <Tab
                        label={t('history')}
                        icon={<History />}
                        iconPosition='start'
                        sx={{ minHeight: '48px' }}
                    />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <InfoPage />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <Suspense>
                    <TournamentsPage />
                </Suspense>
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
                <Suspense>
                    <TournamentsPage status={RoundRobinStatuses.COMPLETE} />
                </Suspense>
            </TabPanel>
        </Container>
    );
};
