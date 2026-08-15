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
import { useTranslations } from 'next-intl';

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
    labelKey: string;
    sitePath?: string;
    emailPath?: string;
    discordPath?: string;
}

const notificationRows: NotificationRow[] = [
    {
        labelKey: 'gameComment',
        sitePath: 'siteNotificationSettings.disableGameComment',
    },
    {
        labelKey: 'gameCommentReplies',
        sitePath: 'siteNotificationSettings.disableGameCommentReplies',
    },
    {
        labelKey: 'newFollower',
        sitePath: 'siteNotificationSettings.disableNewFollower',
    },
    {
        labelKey: 'newsfeedComment',
        sitePath: 'siteNotificationSettings.disableNewsfeedComment',
    },
    {
        labelKey: 'newsfeedReaction',
        sitePath: 'siteNotificationSettings.disableNewsfeedReaction',
    },
    {
        labelKey: 'calendarInvite',
        sitePath: 'siteNotificationSettings.disableCalendarInvite',
        discordPath: 'discordNotificationSettings.disableCalendarInvite',
    },
    {
        labelKey: 'meetingBooked',
        discordPath: 'discordNotificationSettings.disableMeetingBooking',
    },
    {
        labelKey: 'meetingCancelled',
        discordPath: 'discordNotificationSettings.disableMeetingCancellation',
    },
    {
        labelKey: 'roundRobin',
        emailPath: 'emailNotificationSettings.disableRoundRobinStart',
        discordPath: 'discordNotificationSettings.disableRoundRobinStart',
    },
    {
        labelKey: 'inactiveWarning',
        emailPath: 'emailNotificationSettings.disableInactiveWarning',
    },
    {
        labelKey: 'newsletter',
        emailPath: 'emailNotificationSettings.disableNewsletter',
    },
    {
        labelKey: 'gettingStarted',
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
    const t = useTranslations('profile.notifications');
    const renderCheckbox = (path?: string) => {
        if (!path) {
            return (
                <Typography
                    variant='body2'
                    sx={{
                        color: 'text.secondary',
                        userSelect: 'none',
                    }}
                >
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
                    {t('heading')}
                </Typography>
                <Divider />
            </Stack>

            <TableContainer component={Paper} elevation={0} variant='outlined'>
                <Table aria-label='notification preferences table'>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {t('heading')}
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Web fontSize='small' />
                                    <Typography
                                        sx={{
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {t('site')}
                                    </Typography>
                                </Stack>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Email fontSize='small' />
                                    <Typography
                                        sx={{
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {t('email')}
                                    </Typography>
                                </Stack>
                            </TableCell>
                            <TableCell align='center'>
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <DiscordIcon />
                                    <Typography
                                        sx={{
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {t('discord')}
                                    </Typography>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {notificationRows.map((row) => (
                            <TableRow key={row.labelKey} hover>
                                <TableCell component='th' scope='row'>
                                    {t(row.labelKey)}
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
