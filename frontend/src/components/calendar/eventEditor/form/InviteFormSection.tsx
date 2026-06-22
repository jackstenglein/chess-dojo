import { useApi } from '@/api/Api';
import { Participant } from '@/database/event';
import { RatingSystem } from '@/database/user';
import Avatar from '@/profile/Avatar';
import {
    Autocomplete,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    debounce,
    Divider,
    FormControlLabel,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Stack,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';

interface SearchParticipant extends Participant {
    chesscom?: string;
    lichess?: string;
}

interface InviteFormSectionProps {
    owner: string;
    /** A list of users invited to the event. */
    invited: Participant[];
    /** Sets the list of users invited to the event. */
    setInvited: (v: Participant[]) => void;
    /** Whether the event can only be booked by people invited. */
    inviteOnly: boolean;
    /** Sets whether the event is invite only. */
    setInviteOnly: (v: boolean) => void;
    /** Errors on the form. */
    errors: Record<string, string>;
}

export function InviteFormSection({
    owner,
    invited,
    setInvited,
    inviteOnly,
    setInviteOnly,
    errors,
}: InviteFormSectionProps) {
    const t = useTranslations('calendar');
    const [options, setOptions] = useState<SearchParticipant[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const api = useApi();

    const searchUsers = api.searchUsers;
    const fetch = useMemo(
        () =>
            debounce((input: string, callback: (results?: SearchParticipant[]) => void) => {
                setLoading(true);
                searchUsers(input.trim(), [
                    'display',
                    'discord',
                    RatingSystem.Chesscom,
                    RatingSystem.Lichess,
                ])
                    .then((resp) => {
                        setLoading(false);
                        callback(
                            resp.map((u) => ({
                                username: u.username,
                                displayName: u.displayName,
                                cohort: u.dojoCohort,
                                previousCohort: u.previousCohort,
                                chesscom: u.ratings[RatingSystem.Chesscom]?.username,
                                lichess: u.ratings[RatingSystem.Lichess]?.username,
                            })),
                        );
                    })
                    .catch(() => {
                        setLoading(false);
                    });
            }, 400),
        [searchUsers],
    );

    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            return;
        }

        fetch(inputValue, (results?: SearchParticipant[]) => {
            if (active && results) {
                setOptions(
                    results.filter(
                        (r) =>
                            !invited.some((user) => r.username === user.username) &&
                            r.username !== owner,
                    ),
                );
            }
        });

        return () => {
            active = false;
        };
    }, [inputValue, fetch, owner, invited]);

    return (
        <Stack>
            <Autocomplete
                sx={{ mb: 2 }}
                multiple
                loading={loading}
                options={options}
                value={invited}
                onChange={(_, users) => setInvited(users)}
                getOptionLabel={(option) => option.displayName}
                filterOptions={(x) => x}
                filterSelectedOptions
                onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={t('inviteUsers')}
                        error={!!errors.invited}
                        helperText={errors.invited}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                endAdornment: (
                                    <Fragment>
                                        {loading ? (
                                            <CircularProgress color='inherit' size={20} />
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </Fragment>
                                ),
                            },
                        }}
                    />
                )}
                renderTags={(users, getTagProps) =>
                    users.map((user, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                            <Chip
                                key={key}
                                avatar={
                                    <Avatar
                                        username={user.username}
                                        displayName={user.displayName}
                                        size={24}
                                        sx={{ ml: '5px', mr: '-6px' }}
                                    />
                                }
                                label={user.displayName}
                                {...tagProps}
                            />
                        );
                    })
                }
                renderOption={({ key, ...props }, user) => {
                    return (
                        <Fragment key={user.username}>
                            <ListItem {...props} sx={{ alignItems: 'flex-start !important' }}>
                                <ListItemAvatar>
                                    <Avatar
                                        username={user.username}
                                        displayName={user.displayName}
                                        size={40}
                                        sx={{ mt: 0.5 }}
                                    />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Stack>
                                            <span>{user.displayName}</span>
                                            <Box component='span' color='text.secondary'>
                                                {user.cohort}
                                            </Box>
                                        </Stack>
                                    }
                                    secondary={<ListItemSecondary user={user} />}
                                />
                            </ListItem>
                            <Divider component='li' />
                        </Fragment>
                    );
                }}
                noOptionsText={t('searchUsers')}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={inviteOnly}
                        onChange={(e) => setInviteOnly(e.target.checked)}
                    />
                }
                label={t('inviteOnlyLabel')}
            />
        </Stack>
    );
}

function ListItemSecondary({ user }: { user: SearchParticipant }) {
    return (
        <Stack direction='row' flexWrap='wrap' columnGap={1.5}>
            {user.chesscom && (
                <span>
                    <SiChessdotcom style={{ color: '#81b64c', verticalAlign: 'middle' }} />{' '}
                    {user.chesscom}
                </span>
            )}
            {user.lichess && (
                <span>
                    <SiLichess style={{ verticalAlign: 'middle' }} /> {user.lichess}
                </span>
            )}
        </Stack>
    );
}
