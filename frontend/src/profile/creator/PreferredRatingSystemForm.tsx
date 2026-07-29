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

interface ExtraRatingSystem {
    ratingSystem: RatingSystem | '';
    username: string;
    hideUsername: boolean;
}

function getUpdate({
    rs,
    username,
    hideUsername,
    extraRatingSystems,
    customName,
    customRating,
}: {
    rs: RatingSystem;
    username: string;
    hideUsername: boolean;
    extraRatingSystems: ExtraRatingSystem[];
    customName: string;
    customRating: number;
}): Partial<User> {
    const ratings: Partial<User['ratings']> = {
        [rs]: {
            username: username.trim(),
            hideUsername,
            startRating: isCustom(rs) ? customRating : 0,
            currentRating: isCustom(rs) ? customRating : 0,
            name: isCustom(rs) ? customName.trim() : '',
        },
    };

    for (const extra of extraRatingSystems) {
        if (extra.ratingSystem == '' || extra.username.trim() === '') {
            continue;
        }

        ratings[extra.ratingSystem] = {
            username: extra.username.trim(),
            hideUsername: extra.hideUsername,
            startRating: 0,
            currentRating: 0,
        };
    }

    const result: Partial<User> = {
        ratingSystem: rs,
        ratings,
    };
    if (isCustom(rs)) {
        result.dojoCohort = customRatingToCohort(customRating);
    }
    return result;
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
    const [extraRatingSystems, setExtraRatingSystems] = useState<ExtraRatingSystem[]>([]);
    const [customName, setCustomName] = useState(user.ratings[RatingSystem.Custom]?.name ?? '');
    const [customRating, setCustomRating] = useState(() => {
        const existing = user.ratings[RatingSystem.Custom]?.currentRating;
        return existing ? String(existing) : '';
    });

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

    const isCustomSelected = isCustom(ratingSystem);
    const parsedCustomRating = parseRating(customRating);
    const customRatingError = customRating.trim() !== '' && parsedCustomRating < 0;

    const canSave = isCustomSelected
        ? parsedCustomRating >= 0
        : (ratingSystem as string) !== '' && username.trim() !== '';

    const onSave = () => {
        request.onStart();
        api.updateUser(
            getUpdate({
                rs: ratingSystem,
                username,
                hideUsername,
                extraRatingSystems,
                customName,
                customRating: parsedCustomRating,
            }),
            !isCustomSelected,
        )
            .then(onNextStep)
            .catch(request.onFailure);
    };

    return (
        <Stack spacing={4}>
            <Typography>{tPreferred('intro')}</Typography>

            <TextField
                required
                select
                label={tPreferred('label')}
                value={ratingSystem}
                onChange={(event) => setPreferredRatingSystem(event.target.value as RatingSystem)}
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
                                    {formatRatingSystem(option, tRating)}
                                </MenuItem>
                            ))}
                        </TextField>

                        {extra.ratingSystem !== '' && (
                            <>
                                <TextField
                                    label={getUsernameLabel(extra.ratingSystem, tRatings)}
                                    value={extra.username}
                                    onChange={(event) =>
                                        updateExtraRatingSystem(index, {
                                            username: event.target.value,
                                        })
                                    }
                                    helperText={getHelperText(
                                        extra.ratingSystem,
                                        tRatings,
                                        tCreator,
                                    )}
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
                                    label={getHideMyLabel(extra.ratingSystem, tCreator)}
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
