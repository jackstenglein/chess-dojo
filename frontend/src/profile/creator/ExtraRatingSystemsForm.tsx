import {
    Button,
    Checkbox,
    FormControlLabel,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { RatingSystem, User, getRatingUsername, hideRatingUsername } from '../../database/user';
import { getHelperText, getUsernameLabel, getUsernameType } from './PreferredRatingSystemForm';
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
                You have been placed in the <strong>{user.dojoCohort}</strong> cohort. You can
                change this later if the program is too hard or too easy.
            </Typography>

            <Typography>
                Add any additional rating systems you would like to track below. These are optional
                and will not affect your cohort.
            </Typography>

            <Grid container columnSpacing={2} alignItems='center'>
                {Object.values(RatingSystems).map((rs) => {
                    if (rs === user.ratingSystem) {
                        return null;
                    }
                    return (
                        <React.Fragment key={rs}>
                            <Grid size={{ xs: 12, sm: 6 }} mb={4}>
                                <TextField
                                    label={getUsernameLabel(rs)}
                                    value={usernames[rs]}
                                    onChange={(event) => setUsername(rs, event.target.value)}
                                    helperText={getHelperText(rs)}
                                    fullWidth
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }} mb={4}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={hideUsernames[rs]}
                                            onChange={(event) =>
                                                setHideUsername(rs, event.target.checked)
                                            }
                                        />
                                    }
                                    label={`Hide ${getUsernameType(rs)} from other Dojo members`}
                                    sx={{ justifyContent: 'end' }}
                                />
                            </Grid>
                        </React.Fragment>
                    );
                })}
            </Grid>

            <Stack direction='row' justifyContent='space-between'>
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    Back
                </Button>

                <Button
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    sx={{ alignSelf: 'end' }}
                >
                    Next
                </Button>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default ExtraRatingSystemsForm;
