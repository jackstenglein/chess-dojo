'use client';

import { useFreeTier } from '@/auth/Auth';
import { useClubFilters } from '@/hooks/useClubFilters';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import UpsellDialog, { RestrictedAction } from '@/upsell/UpsellDialog';
import { TabContext, TabPanel } from '@mui/lab';
import { Box, Button, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AllClubsTab } from './AllClubsTab';
import { MyClubsTab } from './MyClubsTab';

export const ListClubsPage = () => {
    const t = useTranslations('clubs.list');
    const { searchParams, setSearchParams } = useNextSearchParams({ view: 'all' });
    const isFreeTier = useFreeTier();
    const [upsellAction, setUpsellAction] = useState('');
    const filters = useClubFilters();
    const router = useRouter();

    const onCreateClub = () => {
        if (isFreeTier) {
            setUpsellAction(RestrictedAction.CreateClubs);
        } else {
            router.push('/clubs/create');
        }
    };

    return (
        <Container sx={{ py: 4 }}>
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    rowGap: 2,
                    mb: 3,
                }}
            >
                <Typography variant='h5'>{t('title')}</Typography>

                <Button variant='contained' onClick={onCreateClub}>
                    {t('createClub')}
                </Button>
            </Stack>

            <TabContext value={searchParams.get('view') || 'all'}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={searchParams.get('view') || 'all'}
                        onChange={(_, tab: string) => setSearchParams({ view: tab })}
                        variant='scrollable'
                    >
                        <Tab label={t('tabs.all')} value='all' />
                        <Tab label={t('tabs.mine')} value='mine' />
                    </Tabs>
                </Box>

                <TabPanel value='all' sx={{ px: { xs: 0, sm: 3 } }}>
                    <AllClubsTab filters={filters} />
                </TabPanel>
                <TabPanel value='mine' sx={{ px: { xs: 0, sm: 3 } }}>
                    <MyClubsTab filters={filters} />
                </TabPanel>
            </TabContext>

            <UpsellDialog
                open={Boolean(upsellAction)}
                onClose={() => setUpsellAction('')}
                currentAction={upsellAction}
            />
        </Container>
    );
};
