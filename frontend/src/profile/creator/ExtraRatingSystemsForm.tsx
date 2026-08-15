import {
    Button,
    Checkbox,
    FormControlLabel,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { ReactNode, useState } from 'react';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { RatingSystem, User, getRatingUsername, hideRatingUsername } from '../../database/user';
import { getHelperText, getHideMyLabel, getUsernameLabel } from './PreferredRatingSystemForm';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

const { Custom, Custom2, Custom3, ...RatingSystems } = RatingSystem;

function getUpdate(
    user: User,
    usernames: Record<RatingSystem, string>,
    hideUsernames: Record<RatingSystem, boolean>,
): Partial<User> {
    const ratings = Object.assign({}, user.ratings);

    Object.entries(usernames).forEach(([rs, username]) => {
        if (username.trim() !== '') {
            ratings[rs as RatingSystem] = {
                username,
                hideUsername: hideUsernames[rs as RatingSystem],
                startRating: 0,
                currentRating: 0,
            };
        }
    });
    return { ratings };
}

const ExtraRatingSystemsForm: React.FC<ProfileCreatorFormProps> = ({
    user,
    onNextStep,
    onPrevStep,
}) => {
    const tRatings = useTranslations('profile.ratings');
    const tCreator = useTranslations('profile.creator');
    const tExtra = useTranslations('profile.creator.extra');
    const api = useApi();
    const request = useRequest();

    const [usernames, setUsernames] = useState<Record<RatingSystem, string>>(
        Object.values(RatingSystems).reduce<Record<string, string>>((map, rs) => {
            map[rs] = getRatingUsername(user, rs);
            return map;
        }, {}),
    );

    const [hideUsernames, setHideUsernames] = useState<Record<RatingSystem, boolean>>(
        Object.values(RatingSystems).reduce<Record<string, boolean>>((map, rs) => {
            map[rs] = hideRatingUsername(user, rs);
            return map;
        }, {}),
    );

    const setUsername = (rs: RatingSystem, value: string) => {
        setUsernames({
            ...usernames,
            [rs]: value,
        });
    };

    const setHideUsername = (rs: RatingSystem, value: boolean) => {
        setHideUsernames({
            ...hideUsernames,
            [rs]: value,
        });
    };

    const onSave = () => {
        const update = getUpdate(user, usernames, hideUsernames);
        if (Object.values(update).length === 0) {
            onNextStep();
            return;
        }

        request.onStart();
        api.updateUser(update)
            .then(onNextStep)
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={4}>
            <Typography>
                {tExtra.rich('cohortPlaced', {
                    cohort: user.dojoCohort,
                    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
                })}
            </Typography>

            <Typography>{tExtra('additionalRatings')}</Typography>

            <Grid
                container
                columnSpacing={2}
                sx={{
                    alignItems: 'center',
                }}
            >
                {Object.values(RatingSystems).map((rs) => {
                    if (rs === user.ratingSystem) {
                        return null;
                    }
                    return (
                        <React.Fragment key={rs}>
                            <Grid
                                size={{ xs: 12, sm: 6 }}
                                sx={{
                                    mb: 4,
                                }}
                            >
                                <TextField
                                    label={getUsernameLabel(rs, tRatings)}
                                    value={usernames[rs]}
                                    onChange={(event) => setUsername(rs, event.target.value)}
                                    helperText={getHelperText(rs, tRatings, tCreator)}
                                    fullWidth
                                />
                            </Grid>

                            <Grid
                                size={{ xs: 12, sm: 6 }}
                                sx={{
                                    mb: 4,
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={hideUsernames[rs]}
                                            onChange={(event) =>
                                                setHideUsername(rs, event.target.checked)
                                            }
                                        />
                                    }
                                    label={getHideMyLabel(rs, tCreator)}
                                    sx={{ justifyContent: 'end' }}
                                />
                            </Grid>
                        </React.Fragment>
                    );
                })}
            </Grid>

            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                }}
            >
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    {tExtra('back')}
                </Button>

                <Button
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    sx={{ alignSelf: 'end' }}
                >
                    {tExtra('next')}
                </Button>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default ExtraRatingSystemsForm;
