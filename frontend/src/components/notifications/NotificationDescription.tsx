import { getDescription, getTitle } from '@/database/notification';
import Avatar from '@/profile/Avatar';
import {
    Notification,
    NotificationTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface NotificationDescriptionProps {
    notification: Notification;
    menuItem?: boolean;
}

const NotificationDescription: React.FC<NotificationDescriptionProps> = (props) => {
    switch (props.notification.type) {
        case NotificationTypes.NEW_FOLLOWER:
            return <NewFollowerNotificationDescription {...props} />;

        default:
            return <DefaultNotificationDescription {...props} />;
    }
};

const DefaultNotificationDescription: React.FC<NotificationDescriptionProps> = ({
    notification,
    menuItem,
}) => {
    const t = useTranslations('notifications');
    return (
        <Stack>
            <Typography
                variant='subtitle1'
                noWrap={menuItem}
                sx={{
                    fontWeight: 'bold',
                }}
            >
                {getTitle(notification, t)}
            </Typography>
            <Typography
                noWrap={menuItem}
                sx={{
                    color: 'text.secondary',
                }}
            >
                {getDescription(notification, t)}
            </Typography>
        </Stack>
    );
};

const NewFollowerNotificationDescription: React.FC<NotificationDescriptionProps> = ({
    notification,
    menuItem,
}) => {
    const t = useTranslations('notifications');
    return (
        <Stack>
            <Typography
                variant='subtitle1'
                noWrap={menuItem}
                sx={{
                    fontWeight: 'bold',
                }}
            >
                {getTitle(notification, t)}
            </Typography>
            <Stack
                direction='row'
                spacing={1}
                sx={{
                    alignItems: 'center',
                }}
            >
                <Avatar
                    username={notification.newFollowerMetadata?.username}
                    displayName={notification.newFollowerMetadata?.displayName}
                    size={44}
                />

                <Stack>
                    <Typography
                        noWrap={menuItem}
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {notification.newFollowerMetadata?.displayName}
                    </Typography>
                    <Typography
                        variant='body2'
                        noWrap={menuItem}
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {notification.newFollowerMetadata?.cohort}
                    </Typography>
                </Stack>
            </Stack>
        </Stack>
    );
};

export default NotificationDescription;
