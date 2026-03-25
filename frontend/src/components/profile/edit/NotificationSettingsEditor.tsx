/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { DiscordIcon } from '@/components/profile/info/DiscordChip';
import { UserNotificationSettings } from '@/database/user';
import { Email, Notifications, Web } from '@mui/icons-material';
import { Checkbox, Divider, FormControlLabel, Stack, Typography } from '@mui/material';
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

interface NotificationSettingsSection {
    labelKey: string;
    settings: { labelKey: string; path: string }[];
    icon: React.ReactNode;
}

const sections: NotificationSettingsSection[] = [
    {
        labelKey: 'site',
        icon: <Web />,
        settings: [
            { labelKey: 'siteGameComment', path: 'siteNotificationSettings.disableGameComment' },
            {
                labelKey: 'siteGameCommentReplies',
                path: 'siteNotificationSettings.disableGameCommentReplies',
            },
            { labelKey: 'siteNewFollower', path: 'siteNotificationSettings.disableNewFollower' },
            {
                labelKey: 'siteNewsfeedComment',
                path: 'siteNotificationSettings.disableNewsfeedComment',
            },
            {
                labelKey: 'siteNewsfeedReaction',
                path: 'siteNotificationSettings.disableNewsfeedReaction',
            },
            {
                labelKey: 'siteCalendarInvite',
                path: 'siteNotificationSettings.disableCalendarInvite',
            },
        ],
    },
    {
        labelKey: 'email',
        icon: <Email />,
        settings: [
            {
                labelKey: 'emailInactiveWarning',
                path: 'emailNotificationSettings.disableInactiveWarning',
            },
            { labelKey: 'emailNewsletter', path: 'emailNotificationSettings.disableNewsletter' },
            {
                labelKey: 'emailRoundRobin',
                path: 'emailNotificationSettings.disableRoundRobinStart',
            },
            {
                labelKey: 'emailGettingStarted',
                path: 'emailNotificationSettings.disableSubscriptionCreated',
            },
        ],
    },
    {
        labelKey: 'discord',
        icon: <DiscordIcon />,
        settings: [
            {
                labelKey: 'discordMeetingBooked',
                path: 'discordNotificationSettings.disableMeetingBooking',
            },
            {
                labelKey: 'discordMeetingCancelled',
                path: 'discordNotificationSettings.disableMeetingCancellation',
            },
            {
                labelKey: 'discordCalendarInvite',
                path: 'discordNotificationSettings.disableCalendarInvite',
            },
            {
                labelKey: 'discordRoundRobin',
                path: 'discordNotificationSettings.disableRoundRobinStart',
            },
        ],
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

            {sections.map((s) => (
                <Stack key={s.labelKey} spacing={0.5}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                        {s.icon}
                        <Typography
                            id={`notifications-${s.labelKey}`}
                            variant='h6'
                            sx={{
                                scrollMarginTop: '88px',
                            }}
                        >
                            {t(s.labelKey)}
                        </Typography>
                    </Stack>

                    {s.settings.map((setting) => (
                        <FormControlLabel
                            key={setting.path}
                            control={
                                <Checkbox
                                    checked={!getSettingValue(notificationSettings, setting.path)}
                                    onChange={(e) =>
                                        setNotificationSettings(
                                            setSettingValue(
                                                notificationSettings,
                                                setting.path,
                                                !e.target.checked,
                                            ),
                                        )
                                    }
                                />
                            }
                            label={t(setting.labelKey)}
                        />
                    ))}
                </Stack>
            ))}
        </Stack>
    );
};

export default NotificationSettingsEditor;
