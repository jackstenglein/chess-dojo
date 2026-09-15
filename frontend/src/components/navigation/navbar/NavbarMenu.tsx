import { useNotifications } from '@/api/cache/Cache';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import NotificationButton from '@/components/notifications/NotificationButton';
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
    Diamond,
    ExpandLess,
    ExpandMore,
    Feed,
    Folder,
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
    PersonSearch,
    Psychology,
    Scoreboard,
    Sell,
    SignalCellularAlt,
    SmartToy,
    Speed,
    Storage,
    Storefront,
    EmojiEvents as Tournaments,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
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
import { useTranslations } from 'next-intl';
import React, { ReactNode, useState, type JSX } from 'react';
import { TimerButton, TimerMenuItem } from '../../timer/TimerButton';
import DarkModeToggle from './DarkModeToggle';
import ProfileButton from './ProfileButton';
import UnauthenticatedMenu from './UnauthenticatedMenu';

function searchNavbarItem(t: ReturnType<typeof useTranslations>): NavbarItem {
    return {
        id: 'search',
        name: t('searchUsers'),
        icon: <SearchIcon />,
        href: '/scoreboard/search',
    };
}

function helpNavbarItem(t: ReturnType<typeof useTranslations>): NavbarItem {
    return {
        id: 'help',
        name: t('help'),
        icon: <Help />,
        href: '/help',
    };
}

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
            <ChessDojoIcon sx={{ color: 'white', fontSize: { xs: '50px', md: '50px' } }} />
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

function allStartItems(
    toggleExpansion: (item: string) => void,
    t: ReturnType<typeof useTranslations>,
): NavbarItem[] {
    return [
        {
            id: 'training-plan',
            name: t('trainingPlan'),
            icon: <Checklist />,
            href: '/profile?view=progress',
        },
        {
            id: 'games',
            name: t('games'),
            icon: <PawnIcon />,
            onClick: () => toggleExpansion('games'),
            children: [
                {
                    id: 'analysis-board',
                    name: t('analysisBoard'),
                    icon: <Biotech />,
                    href: '/games/import',
                },
                {
                    id: 'full-database',
                    name: t('fullDatabase'),
                    icon: <Storage />,
                    href: '/games',
                },
                {
                    id: 'my-games',
                    name: t('myGames'),
                    icon: <AccountCircle />,
                    href: '/profile?view=games&directory=mygames',
                },
                {
                    id: 'my-files',
                    name: t('myFiles'),
                    icon: <Folder />,
                    href: '/profile?view=games',
                },
                {
                    id: 'repertoire-spy',
                    name: t('repertoireSpy'),
                    icon: <PersonSearch />,
                    href: '/games/analysis?explorer=player',
                },
                {
                    id: 'play-bot',
                    name: 'Play Bot',
                    icon: <SmartToy />,
                    href: '/play-bot',
                },
            ],
        },
        {
            id: 'calendar',
            name: t('calendar'),
            icon: <CalendarToday />,
            href: '/calendar',
        },
        {
            id: 'tournaments',
            name: t('tournaments'),
            icon: <Tournaments />,
            onClick: () => toggleExpansion('tournaments'),
            children: [
                {
                    id: 'round-robin',
                    name: t('roundRobin'),
                    icon: <CrossedSwordIcon />,
                    href: '/tournaments/round-robin',
                },
                {
                    id: 'open-classical',
                    name: t('openClassical'),
                    icon: <TournamentBracketIcon />,
                    href: '/tournaments/open-classical',
                },
                {
                    id: 'dojo-liga',
                    name: t('dojoLiga'),
                    icon: <MilitaryTech />,
                    href: '/tournaments/liga',
                },
            ],
        },
        {
            id: 'live-classes',
            name: (
                <>
                    {t('liveClasses')}{' '}
                    <Chip label={t('new')} color='success' size='small' sx={{ ml: 1 }} />{' '}
                </>
            ),
            icon: <PresenterIcon sx={{ fontSize: '24px' }} />,
            href: '/live-classes',
        },
        {
            id: 'learn',
            name: t('learn'),
            icon: <MenuBook />,
            onClick: () => toggleExpansion('learn'),
            children: [
                {
                    id: 'live-classes',
                    name: t('liveClasses'),
                    icon: <PresenterIcon sx={{ fontSize: '24px' }} />,
                    href: '/learn/live-classes',
                },
                {
                    id: 'puzzles',
                    name: t('puzzles'),
                    icon: <Speed />,
                    href: '/tests',
                },
                {
                    id: 'courses',
                    name: t('courses'),
                    icon: <ImportContacts />,
                    href: '/courses',
                },
                {
                    id: 'books',
                    name: t('books'),
                    icon: <AutoStories />,
                    href: '/learn/books',
                },
                {
                    id: 'sparring-positions',
                    name: t('sparringPositions'),
                    icon: <LocalFireDepartment />,
                    href: '/learn/sparring',
                },
                {
                    id: 'model-annotations',
                    name: t('modelAnnotations'),
                    icon: <BorderColor />,
                    href: '/learn/modelgames',
                },
                {
                    id: 'games-to-memorize',
                    name: t('gamesToMemorize'),
                    icon: <Psychology />,
                    href: '/learn/memorizegames',
                },
                {
                    id: 'guides',
                    name: t('guides'),
                    icon: <Info />,
                    href: '/learn/guides',
                },
                {
                    id: 'rating-conversions',
                    name: t('ratingConversions'),
                    icon: <SignalCellularAlt />,
                    href: '/learn/ratings',
                },
            ],
        },
        {
            id: 'social',
            name: t('social'),
            icon: <Groups />,
            onClick: () => toggleExpansion('social'),
            children: [
                {
                    id: 'search-users',
                    name: t('searchUsers'),
                    icon: <SearchIcon />,
                    href: '/scoreboard/search',
                },
                {
                    id: 'newsfeed',
                    name: t('newsfeed'),
                    icon: <Feed />,
                    href: '/newsfeed',
                },
                {
                    id: 'scoreboard',
                    name: t('scoreboard'),
                    icon: <Scoreboard />,
                    href: '/scoreboard',
                },
                {
                    id: 'clubs',
                    name: t('clubs'),
                    icon: <Groups />,
                    href: '/clubs',
                },
                {
                    id: 'blog',
                    name: t('blog'),
                    icon: <Forum />,
                    href: '/blog',
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
            id: 'shop',
            name: t('shop'),
            icon: <Sell />,
            onClick: () => toggleExpansion('shop'),
            children: [
                {
                    id: 'courses',
                    name: t('courses'),
                    icon: <ImportContacts />,
                    href: '/courses',
                },
                {
                    id: 'subscribe',
                    name: t('membership'),
                    icon: <Diamond />,
                    href: '/prices',
                },
                {
                    id: 'merch',
                    name: t('merch'),
                    icon: <Storefront />,
                    href: 'https://www.chessdojo.shop/shop',
                    target: '_blank',
                },
                {
                    id: 'donate',
                    name: t('donate'),
                    href: '/donate',
                    icon: <DonateIcon />,
                },
            ],
        },
    ];
}

function NotificationsMenuItem(): JSX.Element {
    const { notifications } = useNotifications();
    const t = useTranslations('navbar');
    return (
        <MenuItem component={Link} href='/notifications'>
            <ListItemIcon>
                <Badge badgeContent={notifications.length} color='secondary' overlap='circular'>
                    <Notifications />
                </Badge>
            </ListItemIcon>
            <Typography
                sx={{
                    textAlign: 'center',
                }}
            >
                {t('notifications')}
            </Typography>
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

    if (item.id === 'calendar') {
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
                            <Typography
                                sx={{
                                    textAlign: 'center',
                                }}
                            >
                                {child.name}
                            </Typography>
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
                <Typography
                    sx={{
                        textAlign: 'center',
                    }}
                >
                    {item.name} {item.id === 'calendar' && meetingCount ? ` (${meetingCount})` : ''}
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
                                <Typography
                                    sx={{
                                        textAlign: 'center',
                                    }}
                                >
                                    {child.name}
                                </Typography>
                            </MenuItem>
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

function NavIconButton({ item }: { item: NavbarItem }) {
    return (
        <Tooltip title={item.name}>
            <IconButton data-testid={item.id} sx={{ color: 'white' }} href={item.href ?? ''}>
                {item.icon}
            </IconButton>
        </Tooltip>
    );
}

function useNavbarItems(meetingCount: number, handleClose: () => void) {
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const auth = useAuth();
    const t = useTranslations('navbar');

    const showAll = useMediaQuery('(min-width:1500px)');
    const hide2 = useMediaQuery('(min-width:1341px)');
    const hide3 = useMediaQuery('(min-width:1217px)');
    const hide4 = useMediaQuery('(min-width:1000px)');
    const hide5 = useMediaQuery('(min-width:810px)');
    const hide6 = useMediaQuery('(min-width:450px)');

    const showHelp = useMediaQuery('(min-width:680px)');
    const showSearch = useMediaQuery('(min-width:640px)');
    const showTimer = useMediaQuery('(min-width:584px)');
    const showNotifications = useMediaQuery('(min-width:567px)');
    const showProfileDropdown = useMediaQuery('(min-width:542px)');

    const startItems = allStartItems(
        (item: string) => setOpenItems((v) => ({ ...v, [item]: !(v[item] || false) })),
        t,
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
    const searchItem = searchNavbarItem(t);
    const helpItem = helpNavbarItem(t);

    if (showSearch) {
        endItems.push(<NavIconButton key='search' item={searchItem} />);
    } else {
        menuItems.push(
            <NavMenuItem
                key='search'
                item={searchItem}
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

    if (showTimer) {
        endItems.push(<TimerButton key='timer' />);
    } else {
        menuItems.push(<TimerMenuItem key='timer' />);
    }

    if (showHelp) {
        endItems.push(<NavIconButton key='help' item={helpItem} />);
    } else {
        menuItems.push(
            <NavMenuItem key='help' item={helpItem} openItems={openItems} handleClose={onClose} />,
        );
    }

    if (showProfileDropdown) {
        endItems.push(<ProfileButton key='profileDropdown' />);
    } else {
        menuItems.push(
            <DarkModeToggle key='darkMode' />,
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
                <Typography
                    color='error'
                    sx={{
                        textAlign: 'center',
                    }}
                >
                    {t('signOut')}
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

const AuthenticatedMenu = ({ meetingCount }: MenuProps) => {
    const auth = useAuth();
    const t = useTranslations('navbar');
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
                        {t('profile')}
                    </Button>
                </Stack>

                <Button href='/help' sx={{ color: 'white' }}>
                    {t('help')}
                </Button>

                <Button onClick={auth.signout} color='error'>
                    {t('signOut')}
                </Button>
            </>
        );
    }

    return (
        <>
            <Logo />
            <Stack
                spacing={1}
                direction='row'
                sx={{ flexGrow: 1, justifyContent: startItems.length ? 'flex-start' : 'flex-end' }}
            >
                {startItems}

                {menuItems.length > 0 && (
                    <>
                        <Tooltip title={t('more')}>
                            <IconButton
                                data-testid='navbar-more-button'
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
