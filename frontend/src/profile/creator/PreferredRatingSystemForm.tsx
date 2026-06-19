import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import {
    RatingSystem,
    User,
    formatRatingSystem,
    getRatingUsername,
    hideRatingUsername,
} from '@/database/user';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

export function getUsernameLabel(rs: RatingSystem): string {
    switch (rs) {
        case RatingSystem.Chesscom:
            return 'Chess.com Username';
        case RatingSystem.Lichess:
            return 'Lichess Username';
        case RatingSystem.Fide:
            return 'FIDE ID';
        case RatingSystem.Uscf:
            return 'USCF ID';
        case RatingSystem.Ecf:
            return 'ECF Rating Code';
        case RatingSystem.Cfc:
            return 'CFC ID';
        case RatingSystem.Dwz:
            return 'DWZ ID';
        case RatingSystem.Acf:
            return 'ACF ID';
        case RatingSystem.Knsb:
            return 'KNSB ID';
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return '';
    }
}

export function getHelperText(rs: RatingSystem): React.ReactNode | undefined {
    switch (rs) {
        case RatingSystem.Chesscom:
        case RatingSystem.Lichess:
        case RatingSystem.Fide:
        case RatingSystem.Uscf:
        case RatingSystem.Cfc:
        case RatingSystem.Acf:
        case RatingSystem.Knsb:
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return undefined;

        case RatingSystem.Dwz:
            return (
                <>
                    Learn how to find your DWZ ID{' '}
                    <Link href='/help#How%20do%20I%20find%20my%20DWZ%20ID?'>here</Link>
                </>
            );

        case RatingSystem.Ecf:
            return 'Enter your ECF rating code, not your membership number';
    }
}

export function getUsernameType(rs: RatingSystem): string {
    switch (rs) {
        case RatingSystem.Chesscom:
        case RatingSystem.Lichess:
            return 'username';

        case RatingSystem.Fide:
        case RatingSystem.Uscf:
        case RatingSystem.Cfc:
        case RatingSystem.Dwz:
        case RatingSystem.Acf:
        case RatingSystem.Knsb:
            return 'ID';

        case RatingSystem.Ecf:
            return 'rating code';

        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return '';
    }
}

type ExtraRatingSystem = {
    ratingSystem: RatingSystem | '';
    username: string;
    hideUsername: boolean;
};

function getUpdate(
    user: User,
    rs: RatingSystem,
    username: string,
    hideUsername: boolean,
    extraRatingSystems: ExtraRatingSystem[],
): Partial<User> {
    const ratings: Partial<User['ratings']> = {
        ...user.ratings,
        [rs]: {
            username: username.trim(),
            hideUsername,
            startRating: 0,
            currentRating: 0,
        },
    };

    extraRatingSystems.forEach((extra) => {
        if (extra.ratingSystem == '' || extra.username.trim() === '') {
            return;
        }

        ratings[extra.ratingSystem] = {
            username: extra.username.trim(),
            hideUsername: extra.hideUsername,
            startRating: 0,
            currentRating: 0,
        };
    });

    return {
        ratingSystem: rs,
        ratings,
    };
}

const { Custom, Custom2, Custom3, ...RatingSystems } = RatingSystem;

const PreferredRatingSystemForm: React.FC<ProfileCreatorFormProps> = ({
    user,
    onNextStep,
    onPrevStep,
}) => {
    const api = useApi();
    const request = useRequest();

    const [ratingSystem, setRatingSystem] = useState(user.ratingSystem);
    const [username, setUsername] = useState(getRatingUsername(user, ratingSystem) || '');
    const [hideUsername, setHideUsername] = useState(hideRatingUsername(user, ratingSystem));
    const [extraRatingSystems, setExtraRatingSystems] = useState<ExtraRatingSystem[]>([]);

    const getAvailableRatingSystems = (index: number) => {
        const selectedByOtherRows = extraRatingSystems
            .filter((_, i) => i !== index)
            .map((extra) => extra.ratingSystem)
            .filter((rs): rs is RatingSystem => rs !== '');

        return Object.values(RatingSystems).filter((rs) => {
            return rs !== ratingSystem && !selectedByOtherRows.includes(rs);
        });
    };

    const setPreferredRatingSystem = (rs: RatingSystem) => {
        setRatingSystem(rs);
        setUsername(getRatingUsername(user, rs) || '');
        setHideUsername(hideRatingUsername(user, rs));

        setExtraRatingSystems((extras) => extras.filter((extra) => extra.ratingSystem !== rs));
    };

    const addExtraRatingSystem = () => {
        setExtraRatingSystems((extras) => [
            ...extras,
            {
                ratingSystem: '',
                username: '',
                hideUsername: false,
            },
        ]);
    };

    const updateExtraRatingSystem = (index: number, update: Partial<ExtraRatingSystem>) => {
        setExtraRatingSystems((extras) =>
            extras.map((extra, i) => (i === index ? { ...extra, ...update } : extra)),
        );
    };

    const removeExtraRatingSystem = (index: number) => {
        setExtraRatingSystems((extras) => extras.filter((_, i) => i !== index));
    };

    const canAddExtraRatingSystem =
        !extraRatingSystems.some((extra) => extra.ratingSystem === '') &&
        Object.values(RatingSystems).some(
            (rs) =>
                rs !== ratingSystem &&
                !extraRatingSystems.some((extra) => extra.ratingSystem === rs),
        );

    const canSave = (ratingSystem as string) !== '' && username.trim() !== '';

    const onSave = () => {
        request.onStart();
        api.updateUser(
            getUpdate(user, ratingSystem, username, hideUsername, extraRatingSystems),
            true,
        )
            .then(onNextStep)
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={4}>
            <Typography>
                Enter your preferred rating system, and we will place you in a cohort based on your
                rating. You should choose the rating system that best reflects your strength (IE:
                the one you play most often). You can always change your cohort later if the program
                is too hard or too easy.
            </Typography>

            <TextField
                required
                select
                label='Preferred Rating System'
                value={ratingSystem}
                onChange={(event) => setPreferredRatingSystem(event.target.value as RatingSystem)}
                helperText='Choose the rating system you play most often'
            >
                {Object.values(RatingSystems).map((option) => (
                    <MenuItem key={option} value={option}>
                        {formatRatingSystem(option)}
                    </MenuItem>
                ))}
            </TextField>

            {(ratingSystem as string) !== '' && (
                <Stack spacing={3}>
                    <TextField
                        required
                        label={getUsernameLabel(ratingSystem)}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        helperText={getHelperText(ratingSystem)}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={hideUsername}
                                onChange={(event) => setHideUsername(event.target.checked)}
                            />
                        }
                        label={`Hide my ${getUsernameType(ratingSystem)} from other dojo members`}
                    />
                </Stack>
            )}

            <Stack spacing={3}>
                <Typography>
                    Add any additional rating systems you would like to track. These are optional
                    and will not affect your cohort.
                </Typography>

                {extraRatingSystems.map((extra, index) => (
                    <Stack key={index} spacing={2}>
                        <TextField
                            select
                            label='Additional Rating System'
                            value={extra.ratingSystem}
                            onChange={(event) => {
                                const rs = event.target.value as RatingSystem;

                                if (
                                    rs === ratingSystem ||
                                    extraRatingSystems.some(
                                        (extra, i) => i !== index && extra.ratingSystem === rs,
                                    )
                                ) {
                                    return;
                                }

                                updateExtraRatingSystem(index, {
                                    ratingSystem: rs,
                                    username: getRatingUsername(user, rs) || '',
                                    hideUsername: hideRatingUsername(user, rs),
                                });
                            }}
                        >
                            {getAvailableRatingSystems(index).map((option) => (
                                <MenuItem key={option} value={option}>
                                    {formatRatingSystem(option)}
                                </MenuItem>
                            ))}
                        </TextField>

                        {extra.ratingSystem !== '' && (
                            <>
                                <TextField
                                    label={getUsernameLabel(extra.ratingSystem)}
                                    value={extra.username}
                                    onChange={(event) =>
                                        updateExtraRatingSystem(index, {
                                            username: event.target.value,
                                        })
                                    }
                                    helperText={getHelperText(extra.ratingSystem)}
                                />

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={extra.hideUsername}
                                            onChange={(event) =>
                                                updateExtraRatingSystem(index, {
                                                    hideUsername: event.target.checked,
                                                })
                                            }
                                        />
                                    }
                                    label={`Hide my ${getUsernameType(
                                        extra.ratingSystem,
                                    )} from other dojo members`}
                                />
                            </>
                        )}

                        <Button
                            variant='outlined'
                            color='error'
                            onClick={() => removeExtraRatingSystem(index)}
                            sx={{ alignSelf: 'start' }}
                        >
                            Remove
                        </Button>
                    </Stack>
                ))}

                <Button
                    variant='outlined'
                    onClick={addExtraRatingSystem}
                    disabled={!canAddExtraRatingSystem}
                    sx={{ alignSelf: 'start' }}
                >
                    Add Rating System
                </Button>
            </Stack>

            <Stack direction='row' justifyContent='space-between'>
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    Back
                </Button>

                <LoadingButton
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    disabled={!canSave}
                    sx={{ alignSelf: 'end' }}
                >
                    Next
                </LoadingButton>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default PreferredRatingSystemForm;
