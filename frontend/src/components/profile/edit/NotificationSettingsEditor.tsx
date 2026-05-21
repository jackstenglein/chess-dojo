/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { DiscordIcon } from '@/components/profile/info/DiscordChip';
import { UserNotificationSettings } from '@/database/user';
import { Email, Notifications, Web } from '@mui/icons-material';
import {
    Checkbox,
    Divider,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

function getSettingValue(
    notificationSettings: UserNotificationSettings | undefined,
    path: string,
): boolean {
    const components = path.split('.');

    let currentSetting: any = notificationSettings;
    for (const component of components) {
        if (currentSetting === undefined || currentSetting === null) {
            return false;
        }
        currentSetting = currentSetting[component];
    }
    return Boolean(currentSetting);
}

function setSettingValue(
    notificationSettings: UserNotificationSettings | undefined,
    path: string,
    value: boolean,
): UserNotificationSettings {
    const components = path.split('.');
    const result = Object.assign({}, notificationSettings);

    let currentResultSetting: any = result;
    let currentOriginalSetting: any = notificationSettings;

    for (let i = 0; i < components.length - i; i++) {
        const component = components[i];
        currentResultSetting[component] = { ...currentOriginalSetting?.[component] };

        currentResultSetting = currentResultSetting[component];
        currentOriginalSetting = currentOriginalSetting?.[component];
    }

    currentResultSetting[components[components.length - 1]] = value;

    return result;
}

interface NotificationRow {
    label: string;
    sitePath?: string;
    emailPath?: string;
    discordPath?: string;
}

const notificationRows: NotificationRow[] = [
    {
        label: 'Game Comment (New)',
        sitePath: 'siteNotificationSettings.disableGameComment',
    },
    {
        label: 'Game Comment (Reply)',
        sitePath: 'siteNotificationSettings.disableGameCommentReplies',
    },
    {
        label: 'New Follower',
        sitePath: 'siteNotificationSettings.disableNewFollower',
    },
    {
        label: 'Newsfeed Comment',
        sitePath: 'siteNotificationSettings.disableNewsfeedComment',
    },
    {
        label: 'Newsfeed Reaction',
        sitePath: 'siteNotificationSettings.disableNewsfeedReaction',
    },
    {
        label: 'Calendar Event Invite',
        sitePath: 'siteNotificationSettings.disableCalendarInvite',
        discordPath: 'discordNotificationSettings.disableCalendarInvite',
    },
    {
        label: 'Meeting Booked',
        discordPath: 'discordNotificationSettings.disableMeetingBooking',
    },
    {
        label: 'Meeting Cancelled',
        discordPath: 'discordNotificationSettings.disableMeetingCancellation',
    },
    {
        label: 'Round Robin Tournament Start',
        emailPath: 'emailNotificationSettings.disableRoundRobinStart',
        discordPath: 'discordNotificationSettings.disableRoundRobinStart',
    },
    {
        label: 'Account Inactivity Warning',
        emailPath: 'emailNotificationSettings.disableInactiveWarning',
    },
    {
        label: 'Dojo Digest (Newsletter)',
        emailPath: 'emailNotificationSettings.disableNewsletter',
    },
    {
        label: 'Getting Started Tips',
        emailPath: 'emailNotificationSettings.disableSubscriptionCreated',
    },
];

interface NotificationSettingsEditorProps {
    notificationSettings?: UserNotificationSettings;
    setNotificationSettings: (value: UserNotificationSettings) => void;
}

const NotificationSettingsEditor: React.FC<NotificationSettingsEditorProps> = ({
    notificationSettings,
    setNotificationSettings,
}) => {
    const renderCheckbox = (path?: string) => {
        if (!path) {
            return (
                <Typography variant='body2' color='text.secondary' sx={{ userSelect: 'none' }}>
                    —
                </Typography>
            );
        }

        return (
            <Checkbox
                checked={!getSettingValue(notificationSettings, path)}
                onChange={(e) =>
                    setNotificationSettings(
                        setSettingValue(notificationSettings, path, !e.target.checked),
                    )
                }
            />
        );
    };

    return (
        <Stack spacing={2}>
            <Stack
                id='notifications'
                sx={{
                    scrollMarginTop: 'calc(var(--navbar-height) + 8px)',
                }}
            >
                <Typography variant='h5'>
                    <Notifications style={{ verticalAlign: 'middle', marginRight: '0.1em' }} />{' '}
                    Notifications
                </Typography>
                <Divider />
            </Stack>

            <TableContainer component={Paper} elevation={0} variant='outlined'>
                <Table aria-label='notification preferences table'>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Typography fontWeight='bold'>Notification Type</Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    alignItems='center'
                                    justifyContent='center'
                                    spacing={1}
                                >
                                    <Web fontSize='small' />
                                    <Typography fontWeight='bold'>Site</Typography>
                                </Stack>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    alignItems='center'
                                    justifyContent='center'
                                    spacing={1}
                                >
                                    <Email fontSize='small' />
                                    <Typography fontWeight='bold'>Email</Typography>
                                </Stack>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    alignItems='center'
                                    justifyContent='center'
                                    spacing={1}
                                >
                                    <DiscordIcon />
                                    <Typography fontWeight='bold'>Discord</Typography>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {notificationRows.map((row) => (
                            <TableRow key={row.label} hover>
                                <TableCell component='th' scope='row'>
                                    {row.label}
                                </TableCell>
                                <TableCell align='center'>{renderCheckbox(row.sitePath)}</TableCell>
                                <TableCell align='center'>
                                    {renderCheckbox(row.emailPath)}
                                </TableCell>
                                <TableCell align='center'>
                                    {renderCheckbox(row.discordPath)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
};

export default NotificationSettingsEditor;
