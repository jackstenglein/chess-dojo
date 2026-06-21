'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { OpenClassical } from '@/database/tournament';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Container, Stack, Tab, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import BannedPlayersTab from './BannedPlayersTab';
import CompleteTournament from './CompleteTournament';
import PairingsTab from './PairingsTab';
import PlayersTab from './PlayersTab';

const AdminPage = () => {
    const auth = useAuth();
    const [tab, setTab] = useState('players');
    const router = useRouter();

    const api = useApi();
    const request = useRequest<OpenClassical>();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.getOpenClassical()
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, request]);

    useEffect(() => {
        if (!auth.user?.isAdmin && !auth.user?.isTournamentAdmin) {
            router.replace('/tournaments/open-classical');
        }
    }, [auth, router]);

    if (auth.status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container sx={{ py: 5 }}>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Typography variant='h4' mb={2}>
                    Open Classical Admin
                </Typography>
                <CompleteTournament openClassical={request.data} onSuccess={request.onSuccess} />
            </Stack>

            <RequestSnackbar request={request} />

            {request.data && (
                <TabContext value={tab}>
                    <TabList
                        onChange={(_, value: string) => setTab(value)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label='Active Players' value='players' />
                        <Tab label='Pairings' value='pairings' />
                        <Tab label='Banned Players' value='bannedPlayers' />
                    </TabList>
                    <TabPanel value='players'>
                        <PlayersTab openClassical={request.data} onUpdate={request.onSuccess} />
                    </TabPanel>
                    <TabPanel value='pairings'>
                        <PairingsTab openClassical={request.data} onUpdate={request.onSuccess} />
                    </TabPanel>
                    <TabPanel value='bannedPlayers'>
                        <BannedPlayersTab
                            openClassical={request.data}
                            onUpdate={request.onSuccess}
                        />
                    </TabPanel>
                </TabContext>
            )}
        </Container>
    );
};

export default AdminPage;
