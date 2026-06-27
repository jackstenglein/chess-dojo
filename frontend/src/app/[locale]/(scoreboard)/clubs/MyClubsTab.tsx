import { useClubs } from '@/api/cache/clubs';
import { useAuth } from '@/auth/Auth';
import { ClubGrid } from '@/components/clubs/ClubGrid';
import { ClubFilters } from '@/hooks/useClubFilters';
import LoadingPage from '@/loading/LoadingPage';
import { Stack } from '@mui/material';
import { useMemo } from 'react';
import { ClubFilterEditor, filterClubs } from './ClubFilters';

const NO_CLUBS: string[] = [];

interface MyClubsTabProps {
    filters: ClubFilters;
}

export const MyClubsTab: React.FC<MyClubsTabProps> = ({ filters }) => {
    const { user } = useAuth();
    const { clubs, request } = useClubs(user?.clubs || NO_CLUBS);

    const displayedClubs = useMemo(() => filterClubs(clubs, filters), [clubs, filters]);

    if (clubs.length === 0 && request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Stack spacing={3}>
            <ClubFilterEditor filters={filters} />
            <ClubGrid clubs={displayedClubs} request={request} />
        </Stack>
    );
};
