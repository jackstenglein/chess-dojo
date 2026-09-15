import { useApi } from '@/api/Api';
import { useClubs } from '@/api/cache/clubs';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { ClubGrid } from '@/components/clubs/ClubGrid';
import type { ClubFilters } from '@/hooks/useClubFilters';
import LoadingPage from '@/loading/LoadingPage';
import { Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { ClubFilterEditor, filterClubs } from './ClubFilters';

const NO_CLUBS: string[] = [];

interface MyClubsTabProps {
    filters: ClubFilters;
}

export const MyClubsTab: React.FC<MyClubsTabProps> = ({ filters }) => {
    const auth = useAuth();
    const user = auth.user;
    const api = useApi();
    const t = useTranslations('clubs.details');
    const mainClubRequest = useRequest<string>();
    const [settingMainClubId, setSettingMainClubId] = useState<string>();
    const { clubs, request } = useClubs(user?.clubs || NO_CLUBS);

    const displayedClubs = useMemo(() => filterClubs(clubs, filters), [clubs, filters]);

    const onSetMainClub = (clubId: string) => {
        setSettingMainClubId(clubId);
        mainClubRequest.onStart();
        api.updateUser({ mainClubId: clubId })
            .then(() => {
                auth.updateUser({ mainClubId: clubId });
                mainClubRequest.onSuccess(t('mainClubSnackbar'));
            })
            .catch(mainClubRequest.onFailure)
            .finally(() => setSettingMainClubId(undefined));
    };

    if (clubs.length === 0 && request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Stack spacing={3}>
            <RequestSnackbar request={mainClubRequest} showSuccess />
            <ClubFilterEditor filters={filters} />
            <ClubGrid
                clubs={displayedClubs}
                request={request}
                mainClubId={user?.mainClubId}
                onSetMainClub={onSetMainClub}
                settingMainClubId={settingMainClubId}
            />
        </Stack>
    );
};
