import { useNotifications } from '@/api/cache/Cache';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import NotificationButton from '@/components/notifications/NotificationButton';
import { NewsfeedButton } from './NewsfeedButton';
import { getConfig } from '@/config';
import { hasCreatedProfile } from '@/database/user';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { PawnIcon } from '@/style/ChessIcons';
import { CrossedSwordIcon } from '@/style/CrossedSwordIcon';
import { DonateIcon } from '@/style/DonateIcon';
import { FontAwesomeSvgIcon } from '@/style/Icon';
import { PresenterIcon } from '@/style/PresenterIcon';
import { DiscordIcon, TwitchIcon, YoutubeIcon } from '@/style/SocialMediaIcons';
import { TournamentBracketIcon } from '@/style/TournamentIcon';
import { faPatreon } from '@fortawesome/free-brands-svg-icons';
import {
    AccountCircle,
    AutoStories,
    Biotech,
    BorderColor,
    CalendarToday,
    Checklist,
    ChevronRight,
    ExpandLess,
    ExpandMore,
    Feed,
    Forum,
    Groups,
    Help,
    ImportContacts,
    Info,
    LocalFireDepartment,
    Logout,
    MenuBook,
    Menu as MenuIcon,
    MilitaryTech,
    Notifications,
    Person2 as Person2Icon,
    Psychology,
    RocketLaunch,
    Scoreboard,
    Sell,
    SignalCellularAlt,
    Speed,
    Storage,
    Storefront,
    EmojiEvents as Tournaments,
} from '@mui/icons-material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import GroupIcon from '@mui/icons-material/Group';
import LanguageIcon from '@mui/icons-material/Language';
import SearchIcon from '@mui/icons-material/Search';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import {
    Badge,
    Button,
    Chip,
    Collapse,
    IconButton,
    List,
    ListItemIcon,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material';
import React, { ReactNode, useState, type JSX } from 'react';
import DarkModeToggle from './DarkModeToggle';
import ProfileButton from './ProfileButton';
import UnauthenticatedMenu, { ExtraSmallMenuUnauthenticated } from './UnauthenticatedMenu';

const config = getConfig();

export const Logo = () => {
    return (
        <Link
            href='/'
            sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
            }}
        >
            <ChessDojoIcon sx={{ color: 'white', fontSize: { xs: '50px', md: '60px' } }} />
        </Link>
    );
};

interface MenuProps {
    meetingCount: number;
}

export interface NavbarItem {
    id: string;
    name: ReactNode;
    icon?: JSX.Element;
    onClick?: () => void;
    children?: Omit<NavbarItem, 'onClick'>[];
    href?: string;
    target?: '_blank';
}

function allStartItems(toggleExpansion: (item: string) => void): NavbarItem[] {
    return [
        {
            id: 'newsfeed',
            name: 'Newsfeed',
            icon: <Feed />,
            href: '/newsfeed',
        },
        {
            id: 'training-plan',
            name: 'Training Plan',
            icon: <Checklist />,
            href: '/profile?view=progress',
        },
        {
            id: 'scoreboard',
            name: 'Scoreboard',
            icon: <Scoreboard />,
            onClick: () => toggleExpansion('scoreboard'),
            children: [
                {
                    id: 'my-cohort',
                    name: 'My Cohort',
                    icon: <GroupIcon />,
                    href: '/scoreboard',
                },
                {
                    id: 'full-dojo',
                    name: 'Full Dojo',
                    icon: <LanguageIcon />,
                    href: '/scoreboard/dojo',
                },
                {
                    id: 'followers',
                    name: 'Followers',
                    icon: <ThumbUpIcon />,
                    href: '/scoreboard/following',
                },
                {
                    id: 'search-users',
                    name: 'Search Users',
                    icon: <SearchIcon />,
                    href: '/scoreboard/search',
                },
                {
                    id: 'statistics',
                    name: 'Statistics',
                    icon: <AutoGraphIcon />,
                    href: '/scoreboard/stats',
                },
            ],
        },
        {
            id: 'tournaments',
            name: 'Tournaments',
            icon: <Tournaments />,
            onClick: () => toggleExpansion('tournaments'),
            children: [
                {
                    id: 'round-robin',
                    name: 'Round Robin',
                    icon: <CrossedSwordIcon />,
                    href: '/tournaments/round-robin',
                },
                {
                    id: 'open-classical',
                    name: 'Open Classical',
                    icon: <TournamentBracketIcon />,
                    href: '/tournaments/open-classical',
                },
                {
                    id: 'dojo-liga',
                    name: 'DojoLiga',
                    icon: <MilitaryTech />,
                    href: '/tournaments/liga',
                },
            ],
        },
        {
            id: 'games',
            name: 'Games',
            icon: <PawnIcon />,
            onClick: () => toggleExpansion('games'),
            children: [
                {
                    id: 'analysis-board',
                    name: 'Analysis Board',
                    icon: <Biotech />,
                    href: '/games/import',
                },
                {
                    id: 'full-database',
                    name: 'Full Database',
                    icon: <Storage />,
                    href: '/games',
                },
                {
                    id: 'my-games',
                    name: 'My Games',
                    icon: <AccountCircle />,
                    href: '/profile?view=games',
                },
            ],
        },
        {
            id: 'calendar',
            name: 'Calendar',
            icon: <CalendarToday />,
            href: '/calendar',
        },
        {
            id: 'material',
            name: 'Material',
            icon: <MenuBook />,
            onClick: () => toggleExpansion('material'),
            children: [
                {
                    id: 'courses',
                    name: 'Courses',
                    icon: <ImportContacts />,
                    href: '/courses',
                },
                {
                    id: 'live-classes',
                    name: 'Live Classes',
                    icon: <PresenterIcon sx={{ fontSize: '24px' }} />,
                    href: '/material/live-classes',
                },
                {
                    id: 'tests',
                    name: 'Tests',
                    icon: <Speed />,
                    href: '/tests',
                },
                {
                    id: 'books',
                    name: 'Books',
                    icon: <AutoStories />,
                    href: '/material/books',
                },
                {
                    id: 'sparring-positions',
                    name: 'Sparring Positions',
                    icon: <LocalFireDepartment />,
                    href: '/material/sparring',
                },
                {
                    id: 'model-annotations',
                    name: 'Model Annotations',
                    icon: <BorderColor />,
                    href: '/material/modelgames',
                },
                {
                    id: 'games-to-memorize',
                    name: 'Games to Memorize',
                    icon: <Psychology />,
                    href: '/material/memorizegames',
                },
                {
                    id: 'rating-conversions',
                    name: 'Rating Conversions',
                    icon: <SignalCellularAlt />,
                    href: '/material/ratings',
                },
                {
                    id: 'guides',
                    name: 'Guides',
                    icon: <Info />,
                    href: '/material/guides',
                },
                {
                    id: 'discord',
                    name: 'Discord',
                    icon: <DiscordIcon sx={{ color: '#5865f2' }} />,
                    href: config.discord.url,
                    target: '_blank',
                },
                {
                    id: 'twitch',
                    name: 'Twitch',
                    icon: <TwitchIcon color='twitch' />,
                    href: 'https://www.twitch.tv/chessdojo/videos',
                    target: '_blank',
                },
                {
                    id: 'youtube',
                    name: 'YouTube',
                    icon: <YoutubeIcon color='youtube' />,
                    href: 'https://www.youtube.com/@ChessDojo',
                    target: '_blank',
                },
                {
                    id: 'patreon',
                    name: 'Patreon',
                    icon: <FontAwesomeSvgIcon icon={faPatreon} sx={{ color: 'white' }} />,
                    href: 'https://www.patreon.com/ChessDojo',
                    target: '_blank',
                },
            ],
        },
        {
            id: 'live-classes',
            name: (
                <>
                    Live Classes{' '}
                    <Chip label='NEW' color='success' size='small' sx={{ ml: 1 }} />{' '}
                </>
            ),
            icon: <PresenterIcon sx={{ fontSize: '24px' }} />,
            href: '/live-classes',
        },
        {
            id: 'clubs',
            name: 'Clubs',
            icon: <Groups />,
            href: '/clubs',
        },
        {
            id: 'blog',
            name: 'Blog',
            icon: <Forum />,
            href: '/blog',
        },
        {
            id: 'shop',
            name: 'Shop',
            icon: <Sell />,
            onClick: () => toggleExpansion('shop'),
            children: [
                {
                    id: 'courses',
                    name: 'Courses',
                    icon: <ImportContacts />,
                    href: '/courses',
                },
                {
                    id: 'coaching',
                    name: 'Coaching',
                    icon: <RocketLaunch />,
                    href: '/coaching',
                },
                {
                    id: 'merch',
                    name: 'Merch',
                    icon: <Storefront />,
                    href: 'https://www.chessdojo.shop/shop',
                    target: '_blank',
                },
                {
                    id: 'donate',
                    name: 'Donate',
                    href: '/donate',
                    icon: <DonateIcon />,
                },
            ],
        },
    ];
}

function helpItem(): NavbarItem {
    return {
        id: 'help',
        name: 'Help',
        icon: <Help />,
        href: '/help',
    };
}

function NotificationsMenuItem(): JSX.Element {
    const { notifications } = useNotifications();
    return (
        <MenuItem href='/notifications'>
            <ListItemIcon>
                <Badge badgeContent={notifications.length} color='secondary' overlap='circular'>
                    <Notifications />
                </Badge>
            </ListItemIcon>
            <Typography textAlign='center'>Notifications</Typography>
        </MenuItem>
    );
}

export const StartItem: React.FC<{ item: NavbarItem; meetingCount: number }> = ({
    item,
    meetingCount,
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    if (item.name === 'Calendar') {
        return (
            <Button
                key={item.id}
                onClick={item.onClick}
                sx={{ color: 'white', whiteSpace: 'nowrap' }}
                startIcon={
                    <Badge badgeContent={meetingCount} color='secondary' overlap='circular'>
                        {item.icon}
                    </Badge>
                }
                href={item.href}
                component={Link}
            >
                {item.name}
            </Button>
        );
    }

    return (
        <>
            <Button
                key={item.id}
                onClick={item.children ? handleOpen : item.onClick}
                sx={{ color: 'white', whiteSpace: 'nowrap' }}
                startIcon={item.icon}
                endIcon={item.children ? <ExpandMore /> : undefined}
                component={item.href ? Link : 'button'}
                href={item.href}
            >
                {item.name}
            </Button>
            {item.children && (
                <Menu
                    id='submenu-appbar'
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                >
                    {item.children.map((child) => (
                        <MenuItem
                            key={child.id}
                            onClick={handleClose}
                            component={child.href ? Link : 'li'}
                            href={child.href}
                            target={child.target}
                        >
                            {child.icon && <ListItemIcon>{child.icon}</ListItemIcon>}
                            <Typography textAlign='center'>{child.name}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            )}
        </>
    );
};

export const NavMenuItem: React.FC<{
    item: NavbarItem;
    openItems: Record<string, boolean>;
    handleClose: () => void;
    meetingCount?: number;
}> = ({ item, openItems, handleClose, meetingCount }) => {
    return (
        <>
            <MenuItem
                key={item.id}
                onClick={item.children ? item.onClick : undefined}
                component={item.href ? Link : 'li'}
                href={item.href}
            >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <Typography textAlign='center'>
                    {item.name}{' '}
                    {item.name === 'Calendar' && meetingCount ? ` (${meetingCount})` : ''}
                </Typography>
                {item.children &&
                    (openItems[item.id] ? (
                        <ListItemIcon sx={{ position: 'absolute', right: 0 }}>
                            <ExpandLess />
                        </ListItemIcon>
                    ) : (
                        <ListItemIcon sx={{ position: 'absolute', right: 0 }}>
                            <ExpandMore />
                        </ListItemIcon>
                    ))}
            </MenuItem>
            {item.children && (
                <Collapse key={item.id + '-collapse'} in={openItems[item.id]}>
                    <List component='div' disablePadding>
                        {item.children.map((child) => (
                            <MenuItem
                                key={child.id}
                                onClick={handleClose}
                                sx={{ pl: 3 }}
                                component={child.href ? Link : 'li'}
                                href={child.href}
                                target={child.target}
                            >
                                {child.icon ? (
                                    <ListItemIcon>{child.icon}</ListItemIcon>
                                ) : (
                                    <ListItemIcon>
                                        <ChevronRight />
                                    </ListItemIcon>
                                )}
                                <Typography textAlign='center'>{child.name}</Typography>
                            </MenuItem>
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

function HelpButton() {
    return (
        <Tooltip key='help' title='Help'>
            <IconButton data-cy='Help' key='help' sx={{ color: 'white' }} href='/help'>
                <Help />
            </IconButton>
        </Tooltip>
    );
}

function useNavbarItems(meetingCount: number, handleClose: () => void) {
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const auth = useAuth();

    const showAll = useMediaQuery('(min-width:1856px)');
    const hide2 = useMediaQuery('(min-width:1694px)');
    const hide3 = useMediaQuery('(min-width:1599px)');
    const hide4 = useMediaQuery('(min-width:1388px)');
    const hide5 = useMediaQuery('(min-width:1249px)');
    const hide6 = useMediaQuery('(min-width:1116px)');
    const hide7 = useMediaQuery('(min-width:990px)');
    const hide8 = useMediaQuery('(min-width:797px)');

    const showHelp = useMediaQuery('(min-width:624px)');
    const showNewsfeed = useMediaQuery('(min-width:595px)');
    const showNotifications = useMediaQuery('(min-width:567px)');
    const showProfileDropdown = useMediaQuery('(min-width:542px)');

    const startItems = allStartItems((item: string) =>
        setOpenItems((v) => ({ ...v, [item]: !(v[item] || false) })),
    );

    let startItemCount = 0;
    if (showAll) {
        startItemCount = startItems.length;
    } else if (hide2) {
        startItemCount = startItems.length - 2;
    } else if (hide3) {
        startItemCount = startItems.length - 3;
    } else if (hide4) {
        startItemCount = startItems.length - 4;
    } else if (hide5) {
        startItemCount = startItems.length - 5;
    } else if (hide6) {
        startItemCount = startItems.length - 6;
    } else if (hide7) {
        startItemCount = startItems.length - 7;
    } else if (hide8) {
        startItemCount = startItems.length - 8;
    } else {
        startItemCount = startItems.length - 9;
    }

    const onClose = () => {
        setOpenItems({});
        handleClose();
    };

    const shownStartItems: JSX.Element[] = startItems
        .slice(0, startItemCount)
        .map((item) => <StartItem key={item.id} item={item} meetingCount={meetingCount} />);

    const menuItems: JSX.Element[] = startItems
        .slice(startItemCount)
        .map((item) => (
            <NavMenuItem
                key={item.id}
                item={item}
                openItems={openItems}
                handleClose={onClose}
                meetingCount={meetingCount}
            />
        ));

    const endItems: JSX.Element[] = [];

    if (showNewsfeed) {
        endItems.push(<NewsfeedButton key='newsfeed-icon' />);
    } else {
        menuItems.push(
            <NavMenuItem
                key='newsfeed-icon'
                item={{
                    id: 'newsfeed-shortcut',
                    name: 'Newsfeed',
                    icon: <Feed />,
                    href: '/newsfeed',
                }}
                openItems={openItems}
                handleClose={onClose}
            />,
        );
    }

    if (showNotifications) {
        endItems.push(<NotificationButton key='notifications' />);
    } else {
        menuItems.push(<NotificationsMenuItem key='notifications' />);
    }

    if (showHelp) {
        endItems.push(HelpButton());
    } else {
        menuItems.push(
            <NavMenuItem
                key='help'
                item={helpItem()}
                openItems={openItems}
                handleClose={onClose}
            />,
        );
    }

    if (showProfileDropdown) {
        endItems.push(<ProfileButton key='profileDropdown' />);
    } else {
        menuItems.push(
            <MenuItem
                key='signout'
                onClick={() => {
                    auth.signout();
                    onClose();
                }}
            >
                <ListItemIcon>
                    <Logout color='error' />
                </ListItemIcon>
                <Typography textAlign='center' color='error'>
                    Sign Out
                </Typography>
            </MenuItem>,
        );
    }

    return {
        startItems: shownStartItems,
        menuItems: menuItems,
        endItems: endItems,
    };
}

const LargeMenu = ({ meetingCount }: MenuProps) => {
    const auth = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const { startItems, menuItems, endItems } = useNavbarItems(meetingCount, handleClose);
    const profileCreated = hasCreatedProfile(auth.user);

    if (!profileCreated) {
        return (
            <>
                <Logo />
                <Stack spacing={1} direction='row' sx={{ flexGrow: 1 }}>
                    <Button href='/profile' sx={{ color: 'white' }} startIcon={<Person2Icon />}>
                        Profile
                    </Button>
                </Stack>

                <Button href='/help' sx={{ color: 'white' }}>
                    Help
                </Button>

                <Button onClick={auth.signout} sx={{ color: 'white' }}>
                    Sign Out
                </Button>
            </>
        );
    }

    return (
        <>
            <Logo />
            <Stack spacing={1} direction='row' sx={{ flexGrow: 1 }}>
                {startItems}

                {menuItems.length > 0 && (
                    <>
                        <Tooltip title='More'>
                            <IconButton
                                data-cy='navbar-more-button'
                                onClick={handleOpen}
                                sx={{ color: 'white' }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            id='menu-appbar'
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            {menuItems}
                        </Menu>
                    </>
                )}
            </Stack>

            {endItems}
        </>
    );
};

const ExtraSmallMenu = ({ meetingCount }: MenuProps) => {
    const auth = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { notifications } = useNotifications();
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const startItems = allStartItems((item: string) =>
        setOpenItems((v) => ({ ...v, [item]: !(v[item] || false) })),
    );

    if (auth.status === AuthStatus.Unauthenticated) {
        return <ExtraSmallMenuUnauthenticated />;
    }

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setOpenItems({});
    };

    const profileCreated = hasCreatedProfile(auth.user);

    let startItemsJsx: JSX.Element[] = [];
    if (profileCreated) {
        startItemsJsx = startItems.map((item) => (
            <NavMenuItem
                key={item.id}
                item={item}
                openItems={openItems}
                handleClose={handleClose}
                meetingCount={meetingCount}
            />
        ));
    }

    return (
        <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            sx={{ flexGrow: 1, height: 1 }}
        >
            <Logo />
            <IconButton
                data-cy='navbar-more-button'
                size='medium'
                aria-label='navigation menu'
                aria-controls='menu-appbar'
                aria-haspopup='true'
                onClick={handleOpen}
                color='inherit'
            >
                <MenuIcon />
            </IconButton>
            <Menu
                id='menu-appbar'
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                {!profileCreated && (
                    <MenuItem component={Link} href='/profile'>
                        <ListItemIcon>
                            <Person2Icon />
                        </ListItemIcon>
                        <Typography textAlign='center'>Profile</Typography>
                    </MenuItem>
                )}

                {startItemsJsx}

                <MenuItem component={Link} href='/notifications'>
                    <ListItemIcon>
                        <Badge
                            badgeContent={notifications.length}
                            color='secondary'
                            overlap='circular'
                        >
                            <Notifications />
                        </Badge>
                    </ListItemIcon>
                    <Typography textAlign='center'>Notifications</Typography>
                </MenuItem>

                <MenuItem component={Link} href='/help'>
                    <ListItemIcon>
                        <Help />
                    </ListItemIcon>
                    <Typography textAlign='center'>Help</Typography>
                </MenuItem>

                <DarkModeToggle />

                <MenuItem
                    onClick={() => {
                        auth.signout();
                        handleClose();
                    }}
                >
                    <ListItemIcon>
                        <Logout color='error' />
                    </ListItemIcon>
                    <Typography textAlign='center' color='error'>
                        Sign Out
                    </Typography>
                </MenuItem>
            </Menu>
        </Stack>
    );
};

const AuthenticatedMenu = ({ meetingCount }: MenuProps) => {
    const largeMenu = useMediaQuery('(min-width:450px)');
    if (largeMenu) {
        return <LargeMenu meetingCount={meetingCount} />;
    }
    return <ExtraSmallMenu meetingCount={meetingCount} />;
};

const NavbarMenu = ({ meetingCount }: MenuProps) => {
    const auth = useAuth();

    if (auth.status === AuthStatus.Loading) {
        return <Logo />;
    }
    if (auth.status === AuthStatus.Unauthenticated) {
        return <UnauthenticatedMenu />;
    }
    return <AuthenticatedMenu meetingCount={meetingCount} />;
};

export default NavbarMenu;
