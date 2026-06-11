import { dojoCohorts, formatRatingSystem, isCustom, RatingSystem } from '@/database/user';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import AddIcon from '@mui/icons-material/Add';
import Timeline from '@mui/icons-material/Timeline';
import {
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid,
    Link,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';

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

const CUSTOM_RATING_SYSTEMS = [RatingSystem.Custom, RatingSystem.Custom2, RatingSystem.Custom3];

const RATING_SYSTEM_FORMS = [
    {
        system: RatingSystem.Chesscom,
        label: 'Chess.com Username',
        hideLabel: 'Hide Username',
    },
    {
        system: RatingSystem.Lichess,
        label: 'Lichess Username',
        hideLabel: 'Hide Username',
    },
    {
        system: RatingSystem.Fide,
        label: 'FIDE ID',
        hideLabel: 'Hide ID',
    },
    {
        system: RatingSystem.Uscf,
        label: 'USCF ID',
        hideLabel: 'Hide ID',
    },
    {
        system: RatingSystem.Ecf,
        label: 'ECF Rating Code',
        hideLabel: 'Hide Rating Code',
    },
    {
        system: RatingSystem.Cfc,
        label: 'CFC ID',
        hideLabel: 'Hide ID',
    },
    {
        system: RatingSystem.Dwz,
        label: 'DWZ ID',
        hideLabel: 'Hide ID',
    },
    {
        system: RatingSystem.Acf,
        label: 'ACF ID',
        hideLabel: 'Hide ID',
    },
    {
        system: RatingSystem.Knsb,
        label: 'KNSB ID',
        hideLabel: 'Hide ID',
    },
];

const RATING_SYSTEM_FORMS_BY_SYSTEM = new Map(
    RATING_SYSTEM_FORMS.map((form) => [form.system, form]),
);

const RATING_SYSTEM_ORDER = [
    ...RATING_SYSTEM_FORMS.map((form) => form.system),
    ...CUSTOM_RATING_SYSTEMS,
];

function hasNonDefaultRating(value: string): boolean {
    const trimmed = value.trim();
    return trimmed !== '' && trimmed !== '0';
}

export function hasEnteredRatingSystemData(system: RatingSystem, editor: RatingEditor): boolean {
    if (isCustom(system)) {
        return Boolean(
            editor.name.trim() ||
            hasNonDefaultRating(editor.currentRating) ||
            hasNonDefaultRating(editor.startRating),
        );
    }

    return Boolean(
        editor.username.trim() || hasNonDefaultRating(editor.startRating) || editor.hideUsername,
    );
}

export function getRatingSystemLabel(system: RatingSystem): string {
    if (system === RatingSystem.Custom2) {
        return `${formatRatingSystem(system)} (2)`;
    }
    if (system === RatingSystem.Custom3) {
        return `${formatRatingSystem(system)} (3)`;
    }
    return formatRatingSystem(system);
}

function orderRatingSystems(systems: RatingSystem[], preferred: RatingSystem): RatingSystem[] {
    return [...systems].sort((lhs, rhs) => {
        if (lhs === preferred) {
            return -1;
        }
        if (rhs === preferred) {
            return 1;
        }
        return RATING_SYSTEM_ORDER.indexOf(lhs) - RATING_SYSTEM_ORDER.indexOf(rhs);
    });
}

export function getInitialVisibleRatingSystems(
    ratingEditors: Record<RatingSystem, RatingEditor>,
    preferred: RatingSystem,
): RatingSystem[] {
    const systems = RATING_SYSTEM_ORDER.filter(
        (system) =>
            system === preferred || hasEnteredRatingSystemData(system, ratingEditors[system]),
    );
    return orderRatingSystems(systems, preferred);
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
    const [visibleRatingSystems, setVisibleRatingSystems] = useState<RatingSystem[]>(() =>
        getInitialVisibleRatingSystems(ratingEditors, ratingSystem),
    );

    const visibleRatingSystemSet = useMemo(
        () => new Set(visibleRatingSystems),
        [visibleRatingSystems],
    );

    const preferredRatingSystems = useMemo(() => {
        const systems = Array.from(new Set([ratingSystem, ...visibleRatingSystems]));
        return orderRatingSystems(systems, ratingSystem);
    }, [ratingSystem, visibleRatingSystems]);

    const [addMenuAnchorEl, setAddMenuAnchorEl] = useState<null | HTMLElement>(null);
    const addMenuOpen = Boolean(addMenuAnchorEl);

    const availableRatingSystems = useMemo(
        () => RATING_SYSTEM_ORDER.filter((system) => !visibleRatingSystemSet.has(system)),
        [visibleRatingSystemSet],
    );

    const addRatingSystem = (system: RatingSystem) => {
        setVisibleRatingSystems(
            orderRatingSystems([...visibleRatingSystems, system], ratingSystem),
        );
        setAddMenuAnchorEl(null);
    };

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
                    Ratings
                </Typography>
                <Divider />
            </Stack>

            <TextField
                required
                select
                label='ChessDojo Cohort'
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
                label='Preferred Rating System'
                value={ratingSystem}
                onChange={(event) => setRatingSystem(event.target.value as RatingSystem)}
                error={!!errors.ratingSystem}
                helperText={errors.ratingSystem}
            >
                {preferredRatingSystems.map((option) => (
                    <MenuItem key={option} value={option}>
                        {getRatingSystemLabel(option)}
                    </MenuItem>
                ))}
            </TextField>

            {availableRatingSystems.length > 0 && (
                <Stack direction='row' justifyContent='flex-start'>
                    <Button
                        variant='outlined'
                        startIcon={<AddIcon />}
                        onClick={(event) => setAddMenuAnchorEl(event.currentTarget)}
                    >
                        Add Rating System
                    </Button>
                    <Menu
                        anchorEl={addMenuAnchorEl}
                        open={addMenuOpen}
                        onClose={() => setAddMenuAnchorEl(null)}
                    >
                        {availableRatingSystems.map((system) => (
                            <MenuItem key={system} onClick={() => addRatingSystem(system)}>
                                <ListItemIcon>
                                    <RatingSystemIcon system={system} size='small' />
                                </ListItemIcon>
                                <ListItemText primary={getRatingSystemLabel(system)} />
                            </MenuItem>
                        ))}
                    </Menu>
                </Stack>
            )}

            {visibleRatingSystems.map((rs) => {
                if (!isCustom(rs)) {
                    const form = RATING_SYSTEM_FORMS_BY_SYSTEM.get(rs);
                    if (!form) {
                        return null;
                    }

                    const usernameError = errors[`${rs}Username`];
                    const startRatingError = errors[`${rs}StartRating`];

                    return (
                        <Grid key={rs} container columnGap={2} alignItems='start'>
                            <Grid size='grow'>
                                <TextField
                                    required={ratingSystem === rs}
                                    label={form.label}
                                    value={ratingEditors[rs].username}
                                    onChange={(event) => setUsername(rs, event.target.value)}
                                    error={!!usernameError}
                                    helperText={
                                        usernameError || form.label === 'DWZ ID' ? (
                                            <>
                                                Learn how to find your DWZ ID{' '}
                                                <Link href='/help#How%20do%20I%20find%20my%20DWZ%20ID?'>
                                                    here
                                                </Link>
                                            </>
                                        ) : (
                                            "Leave blank if you don't have an account"
                                        )
                                    }
                                    sx={{ width: 1 }}
                                />
                            </Grid>

                            <Grid size='grow'>
                                <TextField
                                    label='Start Rating'
                                    value={ratingEditors[rs].startRating}
                                    onChange={(event) => setStartRating(rs, event.target.value)}
                                    error={!!startRatingError}
                                    helperText={
                                        startRatingError ||
                                        'Your rating when you first joined the Dojo'
                                    }
                                    sx={{ width: 1 }}
                                />
                            </Grid>

                            <Grid size='grow'>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={ratingEditors[rs].hideUsername}
                                            onChange={(event) =>
                                                setHidden(rs, event.target.checked)
                                            }
                                        />
                                    }
                                    label={form.hideLabel}
                                />
                            </Grid>
                        </Grid>
                    );
                }

                const idx = CUSTOM_RATING_SYSTEMS.indexOf(rs);

                return (
                    <Grid key={rs} container columnGap={2} alignItems='start'>
                        <Grid size='grow'>
                            <TextField
                                label={`Custom ${idx + 1} Rating Name`}
                                value={ratingEditors[rs].name}
                                onChange={(event) => setRatingName(rs, event.target.value)}
                                sx={{ width: 1 }}
                                error={!!errors[`${rs}Name`]}
                                helperText={errors[`${rs}Name`] || 'Manually track your rating'}
                            />
                        </Grid>

                        <Grid size='grow'>
                            <TextField
                                required={ratingSystem === rs}
                                label='Current Rating'
                                value={ratingEditors[rs].currentRating}
                                onChange={(event) => setCurrentRating(rs, event.target.value)}
                                error={!!errors[`${rs}CurrentRating`]}
                                helperText={
                                    errors[`${rs}CurrentRating`] || 'Your most up to date rating'
                                }
                                sx={{ width: 1 }}
                            />
                        </Grid>

                        <Grid size='grow'>
                            <TextField
                                required={ratingSystem === rs}
                                label='Start Rating'
                                value={ratingEditors[rs].startRating}
                                onChange={(event) => setStartRating(rs, event.target.value)}
                                error={!!errors[`${rs}StartRating`]}
                                helperText={
                                    errors[`${rs}StartRating`] ||
                                    'Your rating when you first joined the Dojo'
                                }
                                sx={{ width: 1 }}
                            />
                        </Grid>
                    </Grid>
                );
            })}

            <FormControlLabel
                label='Enable Zen Mode (hide ratings when viewing your own profile)'
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
