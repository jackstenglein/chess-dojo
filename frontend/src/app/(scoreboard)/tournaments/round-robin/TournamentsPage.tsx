'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { listRoundRobins, RoundRobinListResponse } from '@/api/roundRobinApi';
import { useAuth } from '@/auth/Auth';
import { Tournament } from '@/components/tournaments/round-robin/Tournament';
import { Waitlist } from '@/components/tournaments/round-robin/Waitlist';
import { MastersCohort } from '@/database/game';
import { dojoCohorts } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import LoadingPage from '@/loading/LoadingPage';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    RoundRobin,
    RoundRobinStatus,
    RoundRobinStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { Container, MenuItem, Stack, TextField } from '@mui/material';
import { ChangeEvent, useEffect } from 'react';

/** Renders the Round Robin tournaments page. */
export function TournamentsPage({
    status = RoundRobinStatuses.ACTIVE,
}: {
    status?: RoundRobinStatus;
}) {
    const { user } = useAuth();
    const { searchParams, updateSearchParams } = useNextSearchParams({
        cohort: user?.dojoCohort || '0-300',
    });
    const request = useRequest<RoundRobinListResponse>();
    const waitlistRequest = useRequest<RoundRobinListResponse>();

    const cohort = searchParams.get('cohort') || '0-300';
    const reset = request.reset;
    const waitlistReset = waitlistRequest.reset;

    useEffect(() => {
        if (cohort) {
            reset();
            waitlistReset();
        }
    }, [cohort, reset, waitlistReset]);

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();

            listRoundRobins({ cohort, status })
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, cohort, status]);

    useEffect(() => {
        if (!waitlistRequest.isSent() && status === RoundRobinStatuses.ACTIVE) {
            waitlistRequest.onStart();

            listRoundRobins({ cohort, status: RoundRobinStatuses.WAITING })
                .then((resp) => waitlistRequest.onSuccess(resp.data))
                .catch((err) => {
                    waitlistRequest.onFailure(err);
                });
        }
    }, [waitlistRequest, status, cohort]);

    const onChangeCohort = (e: ChangeEvent<HTMLInputElement>) => {
        updateSearchParams({ cohort: e.target.value });
        request.reset();
    };

    const onUpdateTournaments = ({
        waitlist,
        tournament,
    }: {
        waitlist?: RoundRobin;
        tournament?: RoundRobin;
    }) => {
        if (waitlist) {
            waitlistRequest.onSuccess({
                ...waitlistRequest.data,
                tournaments: [waitlist],
            });
        }
        if (tournament) {
            const idx =
                request.data?.tournaments.findIndex((t) => t.startsAt === tournament.startsAt) ??
                -1;
            if (idx < 0) {
                request.onSuccess({
                    ...request.data,
                    tournaments: [...(request.data?.tournaments ?? []), tournament],
                });
            } else {
                request.onSuccess({
                    ...request.data,
                    tournaments: [
                        ...(request.data?.tournaments ?? []).slice(0, idx),
                        tournament,
                        ...(request.data?.tournaments ?? []).slice(idx + 1),
                    ],
                });
            }
        }
    };

    return (
        <Container maxWidth='xl'>
            <RequestSnackbar request={request} />
            <RequestSnackbar request={waitlistRequest} />

            <Stack spacing={4}>
                <TextField fullWidth select value={cohort} onChange={onChangeCohort}>
                    {dojoCohorts.map((cohort) => (
                        <MenuItem key={cohort} value={cohort}>
                            <CohortIcon
                                cohort={cohort}
                                sx={{ marginRight: '0.6em', verticalAlign: 'middle' }}
                                tooltip=''
                                size={25}
                            />{' '}
                            {cohort}
                        </MenuItem>
                    ))}
                    <MenuItem value='CHAMPIONS'>
                        <CohortIcon
                            cohort={MastersCohort}
                            sx={{ marginRight: '0.6em', verticalAlign: 'middle' }}
                            tooltip=''
                            size={25}
                        />{' '}
                        Champions' Circuit
                    </MenuItem>
                </TextField>

                {waitlistRequest.data?.tournaments.map((t) => (
                    <Waitlist
                        key={t.startsAt}
                        tournament={t}
                        onUpdateTournaments={onUpdateTournaments}
                    />
                ))}

                {!request.isSent() || request.isLoading() ? (
                    <LoadingPage />
                ) : (
                    request.data?.tournaments.map((t) => (
                        <Tournament
                            key={t.startsAt}
                            tournament={t}
                            onUpdateTournaments={onUpdateTournaments}
                        />
                    ))
                )}
            </Stack>
        </Container>
    );
}
