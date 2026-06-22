import { useAuth } from '@/auth/Auth';
import {
    formatRatingSystem,
    getSystemCurrentRating,
    isCustom,
    RatingSystem,
    User,
} from '@/database/user';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

export const RatingsCard = ({ user }: { user: User }) => {
    const { user: viewer } = useAuth();
    if (viewer?.enableZenMode && viewer.username === user.username) {
        return null;
    }

    const systems = Object.values(RatingSystem)
        .filter((rs) => user.ratings[rs])
        .sort(
            (lhs, rhs) =>
                (user.ratings[rhs]?.currentRating ?? 0) - (user.ratings[lhs]?.currentRating ?? 0),
        );

    if (systems.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardContent>
                <Grid container rowGap={1} alignItems='center'>
                    {systems.map((rs) => {
                        const currentRating = getSystemCurrentRating(user, rs);
                        if (currentRating <= 0) {
                            return null;
                        }

                        return (
                            <RatingRow
                                key={rs}
                                system={rs}
                                currentRating={currentRating}
                                name={user.ratings[rs]?.name}
                            />
                        );
                    })}
                </Grid>
            </CardContent>
        </Card>
    );
};

const RatingRow = ({
    system,
    currentRating,
    name,
}: {
    system: RatingSystem;
    currentRating: number;
    name?: string;
}) => {
    const tRating = useTranslations('enums.ratingSystem');
    return (
        <>
            <Grid display='flex' alignItems='center' justifyContent='center' size={2}>
                <RatingSystemIcon system={system} size='small' />
            </Grid>
            <Grid size={8}>
                <Typography>
                    {formatRatingSystem(system, tRating)} {isCustom(system) && name && ` (${name})`}
                </Typography>
            </Grid>
            <Grid size={2}>
                <Typography fontWeight='bold'>{currentRating}</Typography>
            </Grid>
        </>
    );
};
