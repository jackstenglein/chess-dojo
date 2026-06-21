import { Request, RequestSnackbar } from '@/api/Request';
import { LocationChip } from '@/components/clubs/LocationChip';
import { MemberCountChip } from '@/components/clubs/MemberCountChip';
import { Club } from '@/database/club';
import { ClubAvatar } from '@/profile/Avatar';
import {
    Card,
    CardActionArea,
    CardContent,
    CardHeader,
    Grid,
    Stack,
    SxProps,
    Theme,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface ClubGridProps<T> {
    clubs?: Club[];
    request: Request<T>;
}

export function ClubGrid<T>({ clubs, request }: ClubGridProps<T>) {
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
                    <ListClubItem club={club} sx={{ height: 1 }} />
                </Grid>
            ))}
        </Grid>
    );
}

interface ListClubItemProps {
    club: Club;
    sx?: SxProps<Theme>;
}

export const ListClubItem: React.FC<ListClubItemProps> = ({ club, sx }) => {
    return (
        <Card variant='outlined' sx={sx}>
            <CardActionArea
                sx={{
                    height: 1,
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
                    <Stack direction='row' mb={2} spacing={1} flexWrap='wrap' rowGap={1}>
                        <MemberCountChip count={club.memberCount} />
                        <LocationChip location={club.location} />
                    </Stack>
                    <Typography>{club.shortDescription}</Typography>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};
