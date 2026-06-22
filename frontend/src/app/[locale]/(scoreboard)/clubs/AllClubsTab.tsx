import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import { ClubGrid } from '@/components/clubs/ClubGrid';
import { Club } from '@/database/club';
import { ClubFilters } from '@/hooks/useClubFilters';
import LoadingPage from '@/loading/LoadingPage';
import { Stack } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { ClubFilterEditor, filterClubs } from './ClubFilters';

interface AllClubsTabProps {
    filters: ClubFilters;
}

export const AllClubsTab: React.FC<AllClubsTabProps> = ({ filters }) => {
    const api = useApi();
    const request = useRequest<Club[]>();
    const cache = useCache().clubs;

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.listClubs()
                .then((clubs) => {
                    request.onSuccess(clubs);
                    cache.putMany(clubs);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, cache]);

    const displayedClubs = useMemo(
        () => filterClubs(request.data, filters),
        [request.data, filters],
    );

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Stack spacing={3}>
            <ClubFilterEditor filters={filters} />
            <ClubGrid clubs={displayedClubs} request={request} />
        </Stack>
    );
};
