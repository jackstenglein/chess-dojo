import { Request } from '@/api/Request';
import { TimezoneSelector } from '@/components/calendar/filters/TimezoneSelector';
import { User } from '@/database/user';
import { logger } from '@/logging/logger';
import Avatar from '@/profile/Avatar';
import { Delete, Info, Upload } from '@mui/icons-material';
import { Button, Divider, FormLabel, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import DiscordOAuthButton from './DiscordOAuthButton';
import { LanguageSelector } from './LanguageSelector';

/** The maximum size of the profile picture. */
export const MAX_PROFILE_PICTURE_SIZE_MB = 9;

interface PersonalInfoEditorProps {
    /** The user editing their personal info. */
    user: User;
    /** The display name as typed in the editor. */
    displayName: string;
    /** A callback function to set the display name typed in the editor. */
    setDisplayName: (displayName: string) => void;
    /** The bio as typed in the editor. */
    bio: string;
    /** A callback function to set the bio typed in the editor. */
    setBio: (bio: string) => void;
    /** The coach's bio, as typed in the editor. */
    coachBio: string;
    /** A callback function to set the coach bio typed in the editor. */
    setCoachBio: (coachBio: string) => void;
    /** The user's timezone as selected in the dropdown. */
    timezone: string;
    /** A callback function to set the timezone. */
    setTimezone: (timezone: string) => void;
    /** The user's preferred language. */
    language: string;
    /** A callback function to set the language. */
    setLanguage: (language: string) => void;
    /** The URL of the edited profile picture. */
    profilePictureUrl?: string;
    /** A callback function to set the URL of the edited profile picture. */
    setProfilePictureUrl: (url: string) => void;
    /** A callback function to set the file data of the edited profile picture. */
    setProfilePictureData: (data: string) => void;
    /** The errors in the profile editor form. */
    errors: Record<string, string>;
    /** The request to save the profile information. */
    request: Request<string>;
}

export function PersonalInfoEditor({
    user,
    displayName,
    setDisplayName,
    bio,
    setBio,
    coachBio,
    setCoachBio,
    timezone,
    setTimezone,
    language,
    setLanguage,
    profilePictureUrl,
    setProfilePictureUrl,
    setProfilePictureData,
    errors,
    request,
}: PersonalInfoEditorProps) {
    const t = useTranslations('profile.personalInfo');

    const onChangeProfilePicture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.length) {
            if (files[0].size / 1024 / 1024 > MAX_PROFILE_PICTURE_SIZE_MB) {
                request.onFailure({ message: t('pictureTooLarge') });
                return;
            }

            encodeFileToBase64(files[0])
                .then((encoded) => {
                    setProfilePictureData(encoded);
                    setProfilePictureUrl(URL.createObjectURL(files[0]));
                })
                .catch((err: unknown) => {
                    logger.warn?.(err);
                    request.onFailure({ message: t('fileReadError') });
                });
        }
    };

    const onDeleteProfilePicture = () => {
        setProfilePictureUrl('');
        setProfilePictureData('');
    };

    return (
        <Stack spacing={4}>
            <Stack
                id='personal'
                sx={{
                    scrollMarginTop: 'calc(var(--navbar-height) + 8px)',
                }}
            >
                <Typography variant='h5'>
                    <Info
                        style={{
                            verticalAlign: 'middle',
                            marginRight: '0.1em',
                        }}
                    />{' '}
                    {t('heading')}
                </Typography>
                <Divider />
            </Stack>

            <Stack>
                <FormLabel sx={{ mb: 1 }}>{t('profilePicture')}</FormLabel>
                <Stack
                    direction='row'
                    spacing={3}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Avatar user={user} size={150} url={profilePictureUrl} />
                    <Stack
                        spacing={2}
                        sx={{
                            alignItems: 'start',
                        }}
                    >
                        <Button component='label' variant='outlined' startIcon={<Upload />}>
                            {t('uploadPhoto')}
                            <input
                                type='file'
                                accept='image/*'
                                hidden
                                onChange={onChangeProfilePicture}
                            />
                        </Button>
                        <Button
                            variant='outlined'
                            startIcon={<Delete />}
                            onClick={onDeleteProfilePicture}
                        >
                            {t('deletePhoto')}
                        </Button>
                    </Stack>
                </Stack>
            </Stack>

            <TextField
                required
                label={t('displayName')}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                error={!!errors.displayName}
                helperText={errors.displayName || t('displayNameHelper')}
            />

            <DiscordOAuthButton />

            <TextField
                label={t('bio')}
                multiline
                minRows={3}
                maxRows={6}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                error={!!errors.bio}
                helperText={errors.bio || t('bioHelper')}
            />

            {user.isCoach && (
                <TextField
                    label={t('coachBio')}
                    multiline
                    minRows={3}
                    maxRows={6}
                    value={coachBio}
                    onChange={(event) => setCoachBio(event.target.value)}
                    helperText={t('coachBioHelper')}
                />
            )}

            <TimezoneSelector value={timezone} onChange={setTimezone} />
            <LanguageSelector value={language} onChange={setLanguage} />
        </Stack>
    );
}

export function encodeFileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = function () {
            const base64string = reader.result as string;
            logger.log?.('Base 64 string: ', base64string);
            const encodedString = base64string.split(',')[1];
            resolve(encodedString);
        };
        reader.onerror = () => {
            reject(new Error('Failed to read the file.'));
        };
        reader.readAsDataURL(file);
    });
}
