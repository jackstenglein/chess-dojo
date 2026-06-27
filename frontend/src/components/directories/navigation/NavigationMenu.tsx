import { useAuth } from '@/auth/Auth';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import {
    ALL_MY_UPLOADS_DIRECTORY_ID,
    HOME_DIRECTORY_ID,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { ChevronLeft, ChevronRight, Home, PeopleAlt, Upload } from '@mui/icons-material';
import {
    CSSObject,
    Divider,
    IconButton,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    List as MuiList,
    Stack,
    Theme,
    Tooltip,
    styled,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useLocalStorage } from 'usehooks-ts';

const openWidth = 167;

const openedMixin = (theme: Theme): CSSObject => ({
    width: openWidth,
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    width: theme.spacing(6),
});

const List = styled(MuiList, { shouldForwardProp: (prop) => prop !== 'open' })<{ open: boolean }>(
    ({ theme }) => ({
        width: openWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        '& .MuiListItemButton-root': {
            borderRadius: theme.spacing(0.75),

            '& .MuiListItemIcon-root': {
                minWidth: 0,
                justifyContent: 'center',
            },
        },
        variants: [
            {
                props: ({ open }: { open: boolean }) => open,
                style: {
                    ...openedMixin(theme),
                    '& .MuiList-root': openedMixin(theme),
                    '& .MuiListItemButton-root': {
                        '& .MuiListItemIcon-root': {
                            minWidth: 0,
                            justifyContent: 'center',
                            marginRight: theme.spacing(2),
                        },
                    },
                },
            },
            {
                props: ({ open }: { open: boolean }) => !open,
                style: {
                    ...closedMixin(theme),
                    '& .MuiList-root': closedMixin(theme),
                    '& .MuiListItemButton-root': {
                        justifyContent: 'center',

                        '& .MuiListItemIcon-root': {
                            marginRight: 'auto',
                        },

                        '& .MuiListItemText-root': {
                            opacity: 0,
                        },
                    },
                },
            },
        ],
    }),
);

export const NavigationMenu = ({
    namespace,
    id,
    owner,
    enabled,
    defaultValue,
    horizontal,
    hideAllUploads,
    onClick,
}: {
    namespace: string;
    id: string;
    owner: string;
    enabled?: boolean;
    defaultValue?: boolean;
    horizontal?: boolean;
    hideAllUploads?: boolean;
    onClick?: (value: { owner: string; id: string }) => void;
}) => {
    const t = useTranslations('profile.directories.navigationMenu');
    const { user } = useAuth();
    const { updateSearchParams } = useNextSearchParams();
    const [open, setOpen] = useLocalStorage(
        `/DirectoryNavigationMenu/${namespace}/open`,
        defaultValue ?? false,
    );

    if (!user) {
        return null;
    }

    if (!enabled) {
        return null;
    }

    const handleClick = (id: string) => () => {
        if (onClick) {
            onClick({ owner: user.username, id });
        } else {
            updateSearchParams({
                directory: id,
                directoryOwner: user.username,
            });
        }
    };

    if (horizontal) {
        return (
            <Stack direction='row' flexWrap='wrap'>
                <Tooltip title={t('home')} disableInteractive>
                    <IconButton
                        onClick={handleClick(HOME_DIRECTORY_ID)}
                        color={
                            id === HOME_DIRECTORY_ID && owner === user.username
                                ? 'primary'
                                : undefined
                        }
                    >
                        <Home />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedWithMe')} disableInteractive>
                    <IconButton
                        onClick={handleClick(SHARED_DIRECTORY_ID)}
                        color={
                            id === SHARED_DIRECTORY_ID && owner === user.username
                                ? 'primary'
                                : undefined
                        }
                    >
                        <PeopleAlt />
                    </IconButton>
                </Tooltip>
                {!hideAllUploads && (
                    <Tooltip title={t('allMyUploads')} disableInteractive>
                        <IconButton
                            onClick={handleClick(ALL_MY_UPLOADS_DIRECTORY_ID)}
                            color={
                                id === ALL_MY_UPLOADS_DIRECTORY_ID && owner === user.username
                                    ? 'primary'
                                    : undefined
                            }
                        >
                            <Upload />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        );
    }

    return (
        <List dense disablePadding open={open}>
            <Tooltip title={open ? '' : t('home')} disableInteractive>
                <ListItemButton
                    selected={id === HOME_DIRECTORY_ID && owner === user.username}
                    onClick={handleClick(HOME_DIRECTORY_ID)}
                >
                    <ListItemIcon>
                        <Home />
                    </ListItemIcon>
                    <ListItemText primary={t('home')} />
                </ListItemButton>
            </Tooltip>

            <Tooltip title={open ? '' : t('sharedWithMe')} disableInteractive>
                <ListItemButton
                    selected={id === SHARED_DIRECTORY_ID && owner === user.username}
                    onClick={handleClick(SHARED_DIRECTORY_ID)}
                >
                    <ListItemIcon>
                        <PeopleAlt />
                    </ListItemIcon>
                    <ListItemText primary={t('sharedWithMe')} />
                </ListItemButton>
            </Tooltip>

            {!hideAllUploads && (
                <Tooltip title={open ? '' : t('allMyUploads')} disableInteractive>
                    <ListItemButton
                        selected={id === ALL_MY_UPLOADS_DIRECTORY_ID && owner === user.username}
                        onClick={handleClick(ALL_MY_UPLOADS_DIRECTORY_ID)}
                    >
                        <ListItemIcon>
                            <Upload />
                        </ListItemIcon>
                        <ListItemText primary={t('allMyUploads')} />
                    </ListItemButton>
                </Tooltip>
            )}

            <Divider />

            <Tooltip title={open ? '' : t('expand')} disableInteractive>
                <ListItemButton onClick={() => setOpen(!open)}>
                    <ListItemIcon>{open ? <ChevronLeft /> : <ChevronRight />}</ListItemIcon>
                    <ListItemText primary={t('collapse')} />
                </ListItemButton>
            </Tooltip>
        </List>
    );
};
