import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import {
    RatingSystem,
    User,
    dojoCohorts,
    formatRatingSystem,
    getRatingUsername,
    hideRatingUsername,
    isCustom,
    isRatingInRange,
} from '@/database/user';
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

function getUpdate(rs: RatingSystem, username: string, hideUsername: boolean): Partial<User> {
    const result: Partial<User> = {
        ratingSystem: rs,
        ratings: {
            [rs]: {
                username,
                hideUsername,
                startRating: 0,
                currentRating: 0,
            },
        },
    };

    return result;
}

function getCustomUpdate(name: string, currentRating: number): Partial<User> {
    return {
        ratingSystem: RatingSystem.Custom,
        ratings: {
            [RatingSystem.Custom]: {
                username: '',
                hideUsername: false,
                name: name.trim(),
                startRating: currentRating,
                currentRating,
            },
        },
        dojoCohort: customRatingToCohort(currentRating),
    };
}

function customRatingToCohort(rating: number): string {
    return dojoCohorts.find((cohort) => isRatingInRange(rating, cohort)) ?? '2400+';
}

function parseRating(rating: string): number {
    const trimmed = rating.trim();
    if (trimmed === '') {
        return -1;
    }
    const normalized = trimmed.replace(/^0+/, '') || '0';
    const n = Math.floor(Number(normalized));
    if (!Number.isFinite(n) || n < 0 || String(n) !== normalized) {
        return -1;
    }
    return n;
}

const { Custom2, Custom3, ...RatingSystems } = RatingSystem;

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
    const [customName, setCustomName] = useState(user.ratings[RatingSystem.Custom]?.name ?? '');
    const [customRating, setCustomRating] = useState(() => {
        const existing = user.ratings[RatingSystem.Custom]?.currentRating;
        return existing ? String(existing) : '';
    });

    const isCustomSelected = isCustom(ratingSystem);
    const parsedCustomRating = parseRating(customRating);
    const customRatingError = customRating.trim() !== '' && parsedCustomRating < 0;

    const canSave = isCustomSelected
        ? parsedCustomRating >= 0
        : (ratingSystem as string) !== '' && username !== '';

    const onSave = () => {
        request.onStart();
        const promise = isCustomSelected
            ? api.updateUser(getCustomUpdate(customName, parsedCustomRating), false)
            : api.updateUser(getUpdate(ratingSystem, username, hideUsername), true);
        promise.then(onNextStep).catch((err) => {
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
                onChange={(event) => setRatingSystem(event.target.value as RatingSystem)}
                helperText='Choose the rating system you play most often'
            >
                {Object.values(RatingSystems).map((option) => (
                    <MenuItem key={option} value={option}>
                        {formatRatingSystem(option)}
                    </MenuItem>
                ))}
            </TextField>

            {isCustomSelected && (
                <Stack spacing={3}>
                    <TextField
                        label='Custom Rating Name'
                        value={customName}
                        onChange={(event) => setCustomName(event.target.value)}
                        helperText='Optional name for your rating system (e.g. "School Tournament")'
                    />

                    <TextField
                        required
                        label='Current Rating'
                        value={customRating}
                        onChange={(event) => setCustomRating(event.target.value)}
                        error={customRatingError}
                        helperText={
                            customRatingError
                                ? 'Rating must be a non-negative integer'
                                : parsedCustomRating >= 0
                                  ? `You will be placed in the ${customRatingToCohort(
                                        parsedCustomRating,
                                    )} cohort`
                                  : 'Your most up-to-date rating'
                        }
                    />
                </Stack>
            )}

            {(ratingSystem as string) !== '' && !isCustomSelected && (
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

            <Stack direction='row' justifyContent='space-between'>
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    Back
                </Button>

                <Button
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    disabled={!canSave}
                    sx={{ alignSelf: 'end' }}
                >
                    Next
                </Button>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default PreferredRatingSystemForm;
