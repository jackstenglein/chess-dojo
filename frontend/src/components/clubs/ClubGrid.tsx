import type { Request } from '@/api/Request';
import { RequestSnackbar } from '@/api/Request';
import { LocationChip } from '@/components/clubs/LocationChip';
import { MainClubChip } from '@/components/clubs/MainClubChip';
import { MemberCountChip } from '@/components/clubs/MemberCountChip';
import type { Club } from '@/database/club';
import { ClubAvatar } from '@/profile/Avatar';
import type { SxProps, Theme } from '@mui/material';
import {
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    CardHeader,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface ClubGridProps<T> {
    clubs?: Club[];
    request: Request<T>;
    mainClubId?: string;
    onSetMainClub?: (clubId: string) => void;
    settingMainClubId?: string;
}

export function ClubGrid<T>({
    clubs,
    request,
    mainClubId,
    onSetMainClub,
    settingMainClubId,
}: ClubGridProps<T>) {
    const t = useTranslations('clubs.grid');
    if (!clubs || clubs.length === 0) {
        return (
            <>
                <RequestSnackbar request={request} />
                <Typography>{t('noClubsFound')}</Typography>
            </>
        );
    }

    return (
        <Grid container rowSpacing={2} columnSpacing={2}>
            <RequestSnackbar request={request} />
            {clubs.map((club) => (
                <Grid
                    key={club.id}
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 4,
                    }}
                >
                    <ListClubItem
                        club={club}
                        isMainClub={club.id === mainClubId}
                        sx={{ height: 1 }}
                        onSetMainClub={onSetMainClub}
                        isSettingMainClub={settingMainClubId !== undefined}
                        isSettingThisClub={club.id === settingMainClubId}
                    />
                </Grid>
            ))}
        </Grid>
    );
}

interface ListClubItemProps {
    club: Club;
    sx?: SxProps<Theme>;
    isMainClub?: boolean;
    onSetMainClub?: (clubId: string) => void;
    isSettingMainClub?: boolean;
    isSettingThisClub?: boolean;
}

export const ListClubItem: React.FC<ListClubItemProps> = ({
    club,
    isMainClub,
    onSetMainClub,
    isSettingMainClub,
    isSettingThisClub,
    sx,
}) => {
    const t = useTranslations('clubs.details');

    return (
        <Card variant='outlined' sx={{ ...sx, display: 'flex', flexDirection: 'column' }}>
            <CardActionArea
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'start',
                    justifyContent: 'start',
                }}
                href={`/clubs/${club.id}`}
            >
                <CardHeader
                    sx={{ pb: 1 }}
                    title={
                        <Stack direction='row' spacing={1} alignItems='center'>
                            <ClubAvatar club={club} size={40} />
                            <Typography variant='h5'>{club.name}</Typography>
                        </Stack>
                    }
                />
                <CardContent sx={{ pt: 0 }}>
                    <Stack direction='row' mb={2} gap={1} flexWrap='wrap'>
                        {isMainClub && <MainClubChip />}
                        <MemberCountChip count={club.memberCount} />
                        <LocationChip location={club.location} />
                    </Stack>
                    <Typography>{club.shortDescription}</Typography>
                </CardContent>
            </CardActionArea>

            {onSetMainClub && !isMainClub && (
                <CardActions sx={{ px: 2, pt: 0, pb: 2, justifyContent: 'flex-end' }}>
                    <Button
                        size='small'
                        onClick={() => onSetMainClub(club.id)}
                        disabled={isSettingMainClub}
                        loading={isSettingThisClub}
                    >
                        {t('setMainClub')}
                    </Button>
                </CardActions>
            )}
        </Card>
    );
};
