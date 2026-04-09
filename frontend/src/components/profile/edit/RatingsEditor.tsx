import { dojoCohorts, formatRatingSystem, RatingSystem } from '@/database/user';
import { Timeline } from '@mui/icons-material';
import {
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    Link,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

export interface RatingEditor {
    username: string;
    hideUsername: boolean;
    startRating: string;
    currentRating: string;
    name: string;
}

interface RatingsEditorProps {
    /** The cohort the user has selected in the profile editor. */
    dojoCohort: string;
    /** A callback function to set the cohort in the profile editor. */
    setDojoCohort: (dojoCohort: string) => void;
    /** The rating system the user has selected as their preferred system in the profile editor. */
    ratingSystem: RatingSystem;
    /** A callback function to set the preferred rating system. */
    setRatingSystem: (ratingSystem: RatingSystem) => void;
    /** The rating system information as currently set in the profile editor. */
    ratingEditors: Record<RatingSystem, RatingEditor>;
    /** A callback to set the rating editor information. */
    setRatingEditors: (ratingEditors: Record<RatingSystem, RatingEditor>) => void;
    /** Whether zen mode is enabled in the profile editor. */
    enableZenMode: boolean;
    /** A callback to set whether zen mode is enabled. */
    setEnableZenMode: (enabled: boolean) => void;
    /** The errors in the profile editor. */
    errors: Record<string, string>;
}

export function RatingsEditor({
    dojoCohort,
    setDojoCohort,
    ratingSystem,
    setRatingSystem,
    ratingEditors,
    setRatingEditors,
    enableZenMode,
    setEnableZenMode,
    errors,
}: RatingsEditorProps) {
    const t = useTranslations('profile.ratings');

    const setUsername = (ratingSystem: RatingSystem, username: string) => {
        setRatingEditors({
            ...ratingEditors,
            [ratingSystem]: {
                ...ratingEditors[ratingSystem],
                username,
            },
        });
    };

    const setCurrentRating = (ratingSystem: RatingSystem, value: string) => {
        setRatingEditors({
            ...ratingEditors,
            [ratingSystem]: {
                ...ratingEditors[ratingSystem],
                currentRating: value,
            },
        });
    };

    const setStartRating = (ratingSystem: RatingSystem, value: string) => {
        setRatingEditors({
            ...ratingEditors,
            [ratingSystem]: {
                ...ratingEditors[ratingSystem],
                startRating: value,
            },
        });
    };

    const setHidden = (ratingSystem: RatingSystem, value: boolean) => {
        setRatingEditors({
            ...ratingEditors,
            [ratingSystem]: {
                ...ratingEditors[ratingSystem],
                hideUsername: value,
            },
        });
    };

    const setRatingName = (ratingSystem: RatingSystem, value: string) => {
        setRatingEditors({
            ...ratingEditors,
            [ratingSystem]: {
                ...ratingEditors[ratingSystem],
                name: value,
            },
        });
    };

    const ratingSystems = RATING_SYSTEM_FORMS.map((rsf) => ({
        required: ratingSystem === rsf.system,
        system: rsf.system,
        label: t(rsf.labelKey),
        hideLabel: t(rsf.hideLabelKey),
        username: ratingEditors[rsf.system].username,
        setUsername: (value: string) => setUsername(rsf.system, value),
        startRating: ratingEditors[rsf.system].startRating,
        setStartRating: (value: string) => setStartRating(rsf.system, value),
        hidden: ratingEditors[rsf.system].hideUsername,
        setHidden: (value: boolean) => setHidden(rsf.system, value),
        usernameError: errors[`${rsf.system}Username`],
        startRatingError: errors[`${rsf.system}StartRating`],
    }));

    return (
        <Stack spacing={4}>
            <Stack
                id='ratings'
                sx={{
                    scrollMarginTop: 'calc(var(--navbar-height) + 8px)',
                }}
            >
                <Typography variant='h5'>
                    <Timeline
                        style={{
                            verticalAlign: 'middle',
                            marginRight: '0.1em',
                        }}
                    />{' '}
                    {t('heading')}
                </Typography>
                <Divider />
            </Stack>

            <TextField
                required
                select
                label={t('cohort')}
                value={dojoCohort}
                onChange={(event) => setDojoCohort(event.target.value)}
                error={!!errors.dojoCohort}
                helperText={errors.dojoCohort}
            >
                {dojoCohorts.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                required
                select
                label={t('preferredSystem')}
                value={ratingSystem}
                onChange={(event) => setRatingSystem(event.target.value as RatingSystem)}
                error={!!errors.ratingSystem}
                helperText={errors.ratingSystem}
            >
                {Object.values(RatingSystem).map((option) => (
                    <MenuItem key={option} value={option}>
                        {option === RatingSystem.Custom
                            ? t('custom')
                            : option === RatingSystem.Custom2
                              ? t('custom2')
                              : option === RatingSystem.Custom3
                                ? t('custom3')
                                : formatRatingSystem(option)}
                    </MenuItem>
                ))}
            </TextField>

            {ratingSystems.map((rs) => (
                <Grid key={rs.label} container columnGap={2} alignItems='start'>
                    <Grid size='grow'>
                        <TextField
                            required={rs.required}
                            label={rs.label}
                            value={rs.username}
                            onChange={(event) => rs.setUsername(event.target.value)}
                            error={!!rs.usernameError}
                            helperText={
                                rs.usernameError || rs.system === RatingSystem.Dwz ? (
                                    <span>
                                        {t.rich('dwzHelper', {
                                            link: (chunks) => (
                                                <Link href='/help#How%20do%20I%20find%20my%20DWZ%20ID?'>
                                                    {chunks}
                                                </Link>
                                            ),
                                        })}
                                    </span>
                                ) : (
                                    t('noAccountHelper')
                                )
                            }
                            sx={{ width: 1 }}
                        />
                    </Grid>

                    <Grid size='grow'>
                        <TextField
                            label={t('startRating')}
                            value={rs.startRating}
                            onChange={(event) => rs.setStartRating(event.target.value)}
                            error={!!rs.startRatingError}
                            helperText={rs.startRatingError || t('startRatingHelper')}
                            sx={{ width: 1 }}
                        />
                    </Grid>

                    <Grid size='grow'>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={rs.hidden}
                                    onChange={(event) => rs.setHidden(event.target.checked)}
                                />
                            }
                            label={rs.hideLabel}
                        />
                    </Grid>
                </Grid>
            ))}

            {CUSTOM_RATING_SYSTEMS.map((rs, idx) => (
                <Grid key={rs} container columnGap={2} alignItems='start'>
                    <Grid size='grow'>
                        <TextField
                            label={t('customRatingName', { number: idx + 1 })}
                            value={ratingEditors[rs].name}
                            onChange={(event) => setRatingName(rs, event.target.value)}
                            sx={{ width: 1 }}
                            error={!!errors[`${rs}Name`]}
                            helperText={errors[`${rs}Name`] || t('customRatingHelper')}
                        />
                    </Grid>

                    <Grid size='grow'>
                        <TextField
                            required={ratingSystem === rs}
                            label={t('currentRating')}
                            value={ratingEditors[rs].currentRating}
                            onChange={(event) => setCurrentRating(rs, event.target.value)}
                            error={!!errors[`${rs}CurrentRating`]}
                            helperText={errors[`${rs}CurrentRating`] || t('currentRatingHelper')}
                            sx={{ width: 1 }}
                        />
                    </Grid>

                    <Grid size='grow'>
                        <TextField
                            required={ratingSystem === rs}
                            label={t('startRating')}
                            value={ratingEditors[rs].startRating}
                            onChange={(event) => setStartRating(rs, event.target.value)}
                            error={!!errors[`${rs}StartRating`]}
                            helperText={errors[`${rs}StartRating`] || t('startRatingHelper')}
                            sx={{ width: 1 }}
                        />
                    </Grid>
                </Grid>
            ))}

            <FormControlLabel
                label={t('zenMode')}
                control={
                    <Checkbox
                        checked={enableZenMode}
                        onChange={(e) => setEnableZenMode(e.target.checked)}
                    />
                }
            />
        </Stack>
    );
}

const CUSTOM_RATING_SYSTEMS = [RatingSystem.Custom, RatingSystem.Custom2, RatingSystem.Custom3];

const RATING_SYSTEM_FORMS = [
    { system: RatingSystem.Chesscom, labelKey: 'chesscomUsername', hideLabelKey: 'hideUsername' },
    { system: RatingSystem.Lichess, labelKey: 'lichessUsername', hideLabelKey: 'hideUsername' },
    { system: RatingSystem.Fide, labelKey: 'fideId', hideLabelKey: 'hideId' },
    { system: RatingSystem.Uscf, labelKey: 'uscfId', hideLabelKey: 'hideId' },
    { system: RatingSystem.Ecf, labelKey: 'ecfRatingCode', hideLabelKey: 'hideRatingCode' },
    { system: RatingSystem.Cfc, labelKey: 'cfcId', hideLabelKey: 'hideId' },
    { system: RatingSystem.Dwz, labelKey: 'dwzId', hideLabelKey: 'hideId' },
    { system: RatingSystem.Acf, labelKey: 'acfId', hideLabelKey: 'hideId' },
    { system: RatingSystem.Knsb, labelKey: 'knsbId', hideLabelKey: 'hideId' },
];
