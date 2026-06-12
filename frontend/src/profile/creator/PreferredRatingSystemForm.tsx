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
import { useTranslations } from 'next-intl';
import { ReactNode, useState } from 'react';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

type RatingsT = ReturnType<typeof useTranslations<'profile.ratings'>>;
type CreatorT = ReturnType<typeof useTranslations<'profile.creator'>>;

export function getUsernameLabel(rs: RatingSystem, t: RatingsT): string {
    switch (rs) {
        case RatingSystem.Chesscom:
            return t('chesscomUsername');
        case RatingSystem.Lichess:
            return t('lichessUsername');
        case RatingSystem.Fide:
            return t('fideId');
        case RatingSystem.Uscf:
            return t('uscfId');
        case RatingSystem.Ecf:
            return t('ecfRatingCode');
        case RatingSystem.Cfc:
            return t('cfcId');
        case RatingSystem.Dwz:
            return t('dwzId');
        case RatingSystem.Acf:
            return t('acfId');
        case RatingSystem.Knsb:
            return t('knsbId');
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return '';
    }
}

export function getHelperText(
    rs: RatingSystem,
    tRatings: RatingsT,
    tCreator: CreatorT,
): React.ReactNode | undefined {
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
            return tRatings.rich('dwzHelper', {
                link: (chunks: ReactNode) => (
                    <Link href='/help#How%20do%20I%20find%20my%20DWZ%20ID?'>{chunks}</Link>
                ),
            });

        case RatingSystem.Ecf:
            return tCreator('ecfRatingCodeHelper');
    }
}

export function getHideMyLabel(rs: RatingSystem, t: CreatorT): string {
    switch (rs) {
        case RatingSystem.Chesscom:
        case RatingSystem.Lichess:
            return t('hideMyUsernameFromMembers');
        case RatingSystem.Fide:
        case RatingSystem.Uscf:
        case RatingSystem.Cfc:
        case RatingSystem.Dwz:
        case RatingSystem.Acf:
        case RatingSystem.Knsb:
            return t('hideMyIdFromMembers');
        case RatingSystem.Ecf:
            return t('hideMyRatingCodeFromMembers');
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
    const tRatings = useTranslations('profile.ratings');
    const tCreator = useTranslations('profile.creator');
    const tPreferred = useTranslations('profile.creator.preferred');
    const tRating = useTranslations('enums.ratingSystem');
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
            <Typography>{tPreferred('intro')}</Typography>

            <TextField
                required
                select
                label={tPreferred('label')}
                value={ratingSystem}
                onChange={(event) => setRatingSystem(event.target.value as RatingSystem)}
                helperText={tPreferred('helper')}
            >
                {Object.values(RatingSystems).map((option) => (
                    <MenuItem key={option} value={option}>
                        {formatRatingSystem(option, tRating)}
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
                        label={getUsernameLabel(ratingSystem, tRatings)}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        helperText={getHelperText(ratingSystem, tRatings, tCreator)}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={hideUsername}
                                onChange={(event) => setHideUsername(event.target.checked)}
                            />
                        }
                        label={getHideMyLabel(ratingSystem, tCreator)}
                    />
                </Stack>
            )}

            <Stack direction='row' justifyContent='space-between'>
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    {tPreferred('back')}
                </Button>

                <Button
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    disabled={!canSave}
                    sx={{ alignSelf: 'end' }}
                >
                    {tPreferred('next')}
                </Button>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default PreferredRatingSystemForm;
