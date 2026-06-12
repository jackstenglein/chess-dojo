import { useRouter } from '@/i18n/navigation';
import { sanitizeRedirectUri } from '@/i18n/sanitizeRedirectUri';
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EventType, trackEvent } from '../../analytics/events';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

// Wire values stored in user.referralSource on the backend. Display labels are
// translated separately via referralOptionLabels at render time.
const defaultSources = [
    'Twitch',
    'YouTube',
    'Discord',
    'Twitter',
    'Reddit',
    'Facebook',
    'Google',
    'Friend/Word of Mouth',
];

function getReferralSource(source: string): string {
    if (!source) {
        return source;
    }
    if (defaultSources.includes(source)) {
        return source;
    }
    return 'Other';
}

const ReferralSourceForm: React.FC<ProfileCreatorFormProps> = ({ user, onPrevStep }) => {
    const t = useTranslations('profile.creator.referral');
    const api = useApi();
    const request = useRequest();
    const redirectUri = useSearchParams().get('redirectUri');
    const router = useRouter();

    const [referralSource, setReferralSource] = useState(getReferralSource(user.referralSource));
    const [otherSource, setOtherSource] = useState(
        defaultSources.includes(user.referralSource) ? '' : user.referralSource,
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const referralOptionLabels: Record<string, string> = {
        Twitch: t('options.twitch'),
        YouTube: t('options.youtube'),
        Discord: t('options.discord'),
        Twitter: t('options.twitter'),
        Reddit: t('options.reddit'),
        Facebook: t('options.facebook'),
        Google: t('options.google'),
        'Friend/Word of Mouth': t('options.friendWordOfMouth'),
    };

    const onSave = () => {
        const newErrors: Record<string, string> = {};
        if (referralSource.trim() === '') {
            newErrors.referralSource = t('fieldRequired');
        }
        if (!defaultSources.includes(referralSource.trim()) && otherSource.trim() === '') {
            newErrors.otherSource = t('fieldRequired');
        }
        setErrors(newErrors);

        if (Object.values(newErrors).length > 0) {
            return;
        }

        const source = referralSource === 'Other' ? otherSource.trim() : referralSource.trim();
        request.onStart();
        api.updateUser({
            referralSource: source,
            hasCreatedProfile: true,
        })
            .then(() => {
                if (redirectUri) {
                    router.push(sanitizeRedirectUri(redirectUri));
                }
                trackEvent(EventType.CreateProfile);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={4}>
            <Typography>{t('question')}</Typography>

            <TextField
                select
                required
                label={t('label')}
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                error={!!errors.referralSource}
                helperText={errors.referralSource}
            >
                {defaultSources.map((s) => (
                    <MenuItem key={s} value={s}>
                        {referralOptionLabels[s] ?? s}
                    </MenuItem>
                ))}

                <MenuItem value='Other'>{t('otherLabel')}</MenuItem>
            </TextField>

            {referralSource === 'Other' && (
                <TextField
                    required
                    label={t('otherSpecify')}
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    error={!!errors.otherSource}
                    helperText={errors.otherSource}
                />
            )}

            <Stack direction='row' justifyContent='space-between'>
                <Button disabled={request.isLoading()} onClick={onPrevStep} variant='contained'>
                    {t('back')}
                </Button>

                <Button
                    loading={request.isLoading()}
                    variant='contained'
                    onClick={onSave}
                    sx={{ alignSelf: 'end' }}
                >
                    {t('next')}
                </Button>
            </Stack>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default ReferralSourceForm;
