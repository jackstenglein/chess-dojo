import { DefaultTimezone, TimezoneSelector } from '@/components/calendar/filters/TimezoneSelector';
import { Button, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { ProfileCreatorFormProps } from './ProfileCreatorPage';

const PersonalInfoForm: React.FC<ProfileCreatorFormProps> = ({ user, onNextStep }) => {
    const api = useApi();
    const request = useRequest();

    const [displayName, setDisplayName] = useState(user.displayName);
    const [bio, setBio] = useState(user.bio);
    const [timezone, setTimezone] = useState(user.timezoneOverride || DefaultTimezone);

    const canSave = displayName.trim().length > 0;

    const onSave = () => {
        if (!canSave) {
            return;
        }

        request.onStart();
        api.updateUser({
            displayName: displayName.trim(),
            bio,
            timezoneOverride: timezone === '' ? user.timezoneOverride : timezone,
        })
            .then(onNextStep)
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={4}>
            <TextField
                required
                label='Display Name'
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                helperText={'This is how other users will identify you'}
            />

            <TextField
                label='Bio (Optional)'
                multiline
                minRows={3}
                maxRows={6}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
            />

            <TimezoneSelector label='Timezone (Optional)' value={timezone} onChange={setTimezone} />

            <Button
                disabled={!canSave}
                loading={request.isLoading()}
                variant='contained'
                onClick={onSave}
                sx={{ alignSelf: 'end' }}
            >
                Next
            </Button>

            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default PersonalInfoForm;
