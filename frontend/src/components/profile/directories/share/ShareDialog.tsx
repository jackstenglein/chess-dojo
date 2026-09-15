import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { getConfig } from '@/config';
import { RatingSystem, User, UserSummary } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import Avatar from '@/profile/Avatar';
import {
    Directory,
    DirectoryAccessRole,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Check, Link } from '@mui/icons-material';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    debounce,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    MenuItem,
    Stack,
    SxProps,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { useDirectoryCache } from '../DirectoryCache';

const roleOptions = [
    {
        role: DirectoryAccessRole.Viewer,
        label: 'Viewer',
        description: 'See all games and subdirectories',
    },
    {
        role: DirectoryAccessRole.Editor,
        label: 'Editor',
        description: 'Add games and remove games they added',
    },
    {
        role: DirectoryAccessRole.Admin,
        label: 'Admin',
        description: 'All directory actions, except deleting the directory',
    },
];

const specialOptions = [
    {
        role: 'REMOVE',
        label: 'Remove Access',
    },
];

type RemovableDirectoryAccessRole = DirectoryAccessRole | 'REMOVE';

export const ShareDialog = ({
    directory,
    onClose,
}: {
    directory: Directory;
    onClose: () => void;
}) => {
    const t = useTranslations('profile.directories');
    const api = useApi();
    const [copied, setCopied] = useState(false);
    const [addedUsers, setAddedUsers] = useState<User[]>([]);
    const [addedRole, setAddedRole] = useState(DirectoryAccessRole.Viewer);
    const [editAccess, setEditAccess] = useState<Record<string, RemovableDirectoryAccessRole>>(
        directory.access || {},
    );

    const request = useRequest();
    const { put: putDirectory } = useDirectoryCache();

    const newAccess = useMemo(() => {
        const newAccess = {
            ...editAccess,
        };
        for (const [username, role] of Object.entries(newAccess)) {
            if (role === 'REMOVE') {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete newAccess[username];
            }
        }

        for (const user of addedUsers) {
            newAccess[user.username] = addedRole;
        }
        return newAccess as Record<string, DirectoryAccessRole>;
    }, [editAccess, addedRole, addedUsers]);

    const changesMade = useMemo(() => {
        if (Object.keys(newAccess).length !== Object.keys(directory.access || {}).length) {
            return true;
        }
        for (const username of Object.keys(directory.access || {})) {
            if (newAccess[username] !== directory.access?.[username]) {
                return true;
            }
        }
        return false;
    }, [newAccess, directory]);

    const onCopyLink = async () => {
        await navigator.clipboard.writeText(
            `${getConfig().baseUrl}/profile/${directory.owner}?view=games&directory=${directory.id}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const onSave = () => {
        request.onStart();

        api.shareDirectory({
            owner: directory.owner,
            id: directory.id,
            access: newAccess,
        })
            .then((resp) => {
                onClose();
                request.onSuccess();
                putDirectory(resp.data);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Dialog fullWidth open onClose={onClose}>
            <DialogTitle>{t('shareTitle', { name: directory.name })}</DialogTitle>
            <DialogContent>
                <AddAccessSection
                    owner={directory.owner}
                    selectedUsers={addedUsers}
                    setSelectedUsers={setAddedUsers}
                    role={addedRole}
                    setRole={setAddedRole}
                    currentAccess={directory.access || {}}
                />

                <CurrentAccessSection
                    owner={directory.owner}
                    access={editAccess}
                    setAccess={setEditAccess}
                />
            </DialogContent>
            <DialogActions>
                <Box sx={{ flexGrow: 1 }}>
                    <Tooltip title={t('copyLink')}>
                        <IconButton color='primary' onClick={onCopyLink}>
                            {copied ? <Check /> : <Link />}
                        </IconButton>
                    </Tooltip>
                </Box>

                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button loading={request.isLoading()} disabled={!changesMade} onClick={onSave}>
                    {t('save')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
};

function AddAccessSection({
    owner,
    selectedUsers,
    setSelectedUsers,
    role,
    setRole,
    currentAccess,
}: {
    owner: string;
    selectedUsers: User[];
    setSelectedUsers: (v: User[]) => void;
    role: DirectoryAccessRole;
    setRole: (r: DirectoryAccessRole) => void;
    currentAccess: Record<string, DirectoryAccessRole>;
}) {
    const t = useTranslations('profile.directories');
    const [options, setOptions] = useState<User[]>([]);
    const [inputValue, setInputValue] = useState('');
    const api = useApi();

    const searchUsers = api.searchUsers;
    const fetch = useMemo(
        () =>
            debounce((input: string, callback: (results?: User[]) => void) => {
                void searchUsers(input.trim(), [
                    'display',
                    'discord',
                    RatingSystem.Chesscom,
                    RatingSystem.Lichess,
                ]).then((resp) => {
                    callback(resp);
                });
            }, 400),
        [searchUsers],
    );

    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            return;
        }

        fetch(inputValue, (results?: User[]) => {
            if (active && results) {
                setOptions(
                    results.filter((r) => !currentAccess[r.username] && r.username !== owner),
                );
            }
        });

        return () => {
            active = false;
        };
    }, [inputValue, fetch, currentAccess, owner]);

    return (
        <>
            <Autocomplete
                sx={{ mt: 1 }}
                multiple
                options={options}
                value={selectedUsers}
                onChange={(_, users) => setSelectedUsers(users)}
                getOptionLabel={(option) => option.displayName}
                filterOptions={(x) => x}
                filterSelectedOptions
                onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
                renderInput={(params) => <TextField {...params} label={t('addPeople')} />}
                renderValue={(users, getItemProps) =>
                    users.map((user, index) => {
                        const { key, ...tagProps } = getItemProps({ index });
                        return (
                            <Chip
                                key={key}
                                avatar={
                                    <Avatar user={user} size={24} sx={{ ml: '5px', mr: '-6px' }} />
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
                                    <Avatar user={user} size={40} sx={{ mt: 0.5 }} />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Stack>
                                            <span>{user.displayName}</span>
                                            <Box
                                                component='span'
                                                sx={{
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {user.dojoCohort}
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

            <RoleSelect
                label={t('role')}
                sx={{ width: 1, mt: 2 }}
                value={role}
                onChange={setRole}
            />
        </>
    );
}

function CurrentAccessSection({
    owner,
    access,
    setAccess,
}: {
    owner: string;
    access: Record<string, RemovableDirectoryAccessRole>;
    setAccess: (a: Record<string, RemovableDirectoryAccessRole>) => void;
}) {
    const t = useTranslations('profile.directories');
    const request = useRequest<Record<string, UserSummary>>();
    const api = useApi();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            const usernames = Object.keys(access || {});
            usernames.push(owner);
            api.getUserSummaries(usernames)
                .then((resp) => {
                    request.onSuccess(
                        resp.data.reduce<Record<string, UserSummary>>((acc, user) => {
                            acc[user.username] = user;
                            return acc;
                        }, {}),
                    );
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, access, owner]);

    const data = request.data;
    return (
        <>
            <RequestSnackbar request={request} />

            <Typography
                variant='h6'
                sx={{
                    mt: 3,
                }}
            >
                {t('currentAccess')}
            </Typography>

            {!request.isSent() || request.isLoading() ? (
                <LoadingPage />
            ) : (
                <List>
                    <ListItem
                        disableGutters
                        disablePadding
                        secondaryAction={<Button disabled>{t('owner')}</Button>}
                    >
                        <ListItemAvatar>
                            <Avatar
                                username={owner}
                                displayName={data?.[owner].displayName}
                                size={32}
                            />
                        </ListItemAvatar>
                        <ListItemText
                            primary={data?.[owner].displayName}
                            secondary={data?.[owner].dojoCohort}
                        />
                    </ListItem>

                    {Object.entries(access).map(([username, role]) => (
                        <ListItem
                            key={username}
                            disableGutters
                            disablePadding
                            secondaryAction={
                                <RoleSelect
                                    value={role}
                                    onChange={(v) => {
                                        setAccess({ ...access, [username]: v });
                                    }}
                                    showRemove
                                    size='small'
                                />
                            }
                        >
                            <ListItemAvatar>
                                <Avatar
                                    username={username}
                                    displayName={data?.[username].displayName}
                                    size={32}
                                />
                            </ListItemAvatar>
                            <ListItemText
                                primary={data?.[username].displayName}
                                secondary={data?.[username].dojoCohort}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </>
    );
}

function ListItemSecondary({ user }: { user: User }) {
    const chesscom = user.ratings[RatingSystem.Chesscom]?.username;
    const lichess = user.ratings[RatingSystem.Lichess]?.username;

    return (
        <Stack
            direction='row'
            sx={{
                flexWrap: 'wrap',
                columnGap: 1.5,
            }}
        >
            {chesscom && (
                <span>
                    <SiChessdotcom style={{ color: '#81b64c', verticalAlign: 'middle' }} />{' '}
                    {chesscom}
                </span>
            )}
            {lichess && (
                <span>
                    <SiLichess style={{ verticalAlign: 'middle' }} /> {lichess}
                </span>
            )}
        </Stack>
    );
}

function RoleSelect({
    value,
    onChange,
    label,
    showRemove,
    sx,
    size,
}: {
    value: RemovableDirectoryAccessRole;
    onChange: (v: DirectoryAccessRole) => void;
    label?: string;
    showRemove?: boolean;
    sx?: SxProps;
    size?: 'small' | 'medium';
}) {
    const t = useTranslations('profile.directories');
    const translatedRoles: Record<string, { label: string; description?: string }> = {
        [DirectoryAccessRole.Viewer]: {
            label: t('roleViewer'),
            description: t('roleViewerDescription'),
        },
        [DirectoryAccessRole.Editor]: {
            label: t('roleEditor'),
            description: t('roleEditorDescription'),
        },
        [DirectoryAccessRole.Admin]: {
            label: t('roleAdmin'),
            description: t('roleAdminDescription'),
        },
    };
    return (
        <TextField
            select
            label={label}
            sx={sx}
            value={value}
            onChange={(e) => onChange(e.target.value as DirectoryAccessRole)}
            slotProps={{
                select: {
                    renderValue: (value) =>
                        translatedRoles[value as string]?.label ??
                        (value === 'REMOVE' ? t('removeAccess') : (value as string)),
                },
            }}
            size={size}
        >
            {roleOptions.map((opt) => (
                <MenuItem key={opt.role} value={opt.role}>
                    <ListItemText
                        primary={translatedRoles[opt.role]?.label ?? opt.label}
                        secondary={translatedRoles[opt.role]?.description ?? opt.description}
                    />
                </MenuItem>
            ))}
            {showRemove && [
                <Divider key='divider' />,
                specialOptions.map((opt) => (
                    <MenuItem key={opt.role} value={opt.role}>
                        <ListItemText
                            primary={opt.role === 'REMOVE' ? t('removeAccess') : opt.label}
                        />
                    </MenuItem>
                )),
            ]}
        </TextField>
    );
}
