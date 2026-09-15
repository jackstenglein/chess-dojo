'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { GetClubResponse } from '@/api/clubApi';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import ScoreboardViewSelector from '@/components/scoreboard/ScoreboardViewSelector';
import LoadingPage from '@/loading/LoadingPage';
import Scoreboard from '@/scoreboard/Scoreboard';
import { Container, Stack } from '@mui/material';
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export function ClubScoreboardPage({ id }: { id: string }) {
    const api = useApi();
    const request = useRequest<GetClubResponse>();
    const { user } = useAuth();

    const reset = request.reset;
    useEffect(() => {
        if (id) {
            reset();
        }
    }, [id, reset]);

    useEffect(() => {
        if (user && id && !request.isSent()) {
            request.onStart();
            api.getClub(id, true)
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [id, request, api, user]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container maxWidth={false} sx={{ pt: 4, pb: 4 }}>
            <RequestSnackbar request={request} />

            <ScoreboardViewSelector value={`clubs/${id}`} />

            <Scoreboard
                user={user}
                rows={request.data?.scoreboard || []}
                loading={request.isLoading()}
                slots={{
                    toolbar: CustomToolbar,
                }}
                slotProps={{
                    toolbar: {
                        id,
                    },
                }}
            />
        </Container>
    );
}

function CustomToolbar({ id }: { id?: string }) {
    const t = useTranslations('scoreboard');

    return (
        <Stack>
            <GridToolbarContainer>
                <GridToolbarColumnsButton />
                <GridToolbarDensitySelector />
                <GridToolbarFilterButton />
            </GridToolbarContainer>
            <Link href={`/clubs/${id}`} sx={{ mt: 0.5, ml: 0.5 }}>
                {t('goToClub')}
            </Link>
        </Stack>
    );
}
