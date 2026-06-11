import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EventType, trackEvent } from '../../analytics/events';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

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
    const api = useApi();
    const request = useRequest();
    const redirectUri = useSearchParams().get('redirectUri');
    const router = useRouter();

    const [referralSource, setReferralSource] = useState(getReferralSource(user.referralSource));
    const [otherSource, setOtherSource] = useState(
        defaultSources.includes(user.referralSource) ? '' : user.referralSource,
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const onSave = () => {
        const newErrors: Record<string, string> = {};
        if (referralSource.trim() === '') {
            newErrors.referralSource = 'This field is required';
        }
        if (!defaultSources.includes(referralSource.trim()) && otherSource.trim() === '') {
            newErrors.otherSource = 'This field is required';
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
                    router.push(decodeURIComponent(redirectUri));
                }
                trackEvent(EventType.CreateProfile);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={4}>
            <Typography>How did you hear about the training program?</Typography>

            <TextField
                select
                required
                label='Referral Source'
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value)}
                error={!!errors.referralSource}
                helperText={errors.referralSource}
            >
                {defaultSources.map((s) => (
                    <MenuItem key={s} value={s}>
                        {s}
                    </MenuItem>
                ))}

                <MenuItem value='Other'>Other</MenuItem>
            </TextField>

            {referralSource === 'Other' && (
                <TextField
                    required
                    label='Other (Please Specify)'
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    error={!!errors.otherSource}
                    helperText={errors.otherSource}
                />
            )}

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

export default ReferralSourceForm;
