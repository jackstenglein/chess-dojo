'use client';

import { useApi } from '@/api/Api';
import { Request, RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import {
    Notification,
    NotificationTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Button,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import NotificationDescription from './NotificationDescription';

interface NotificationListItemProps {
    notification: Notification;
    menuItem?: boolean;
}

interface DeletableNotification {
    onDelete: (e: React.MouseEvent) => void;
    deleteRequest: Request<never>;
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
    notification,
    menuItem,
}) => {
    const api = useApi();
    const cache = useCache();
    const request = useRequest<never>();

    const onDeleteNotification = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        request.onStart();
        api.deleteNotification(notification.id)
            .then(() => {
                cache.notifications.remove(notification.id);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <RequestSnackbar request={request} />
            {menuItem ? (
                <NotificationMenuItem
                    notification={notification}
                    onDelete={onDeleteNotification}
                    deleteRequest={request}
                />
            ) : (
                <NotificationItem
                    onDelete={onDeleteNotification}
                    notification={notification}
                    deleteRequest={request}
                />
            )}
        </>
    );
};

const NotificationItem: React.FC<NotificationListItemProps & DeletableNotification> = ({
    notification,
    onDelete,
    deleteRequest,
}) => {
    const t = useTranslations('notifications');
    const href = getLink(notification);
    return (
        <Stack spacing={1}>
            <Stack
                direction='row'
                spacing={1}
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: 1,
                }}
            >
                <NotificationDescription notification={notification} menuItem />

                <Stack direction='row' spacing={2}>
                    <Button href={href}>{t('view')}</Button>

                    {deleteRequest.isLoading() ? (
                        <CircularProgress />
                    ) : (
                        <Tooltip title={t('delete')}>
                            <IconButton onClick={onDelete}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            <Divider />
        </Stack>
    );
};

const NotificationMenuItem: React.FC<NotificationListItemProps & DeletableNotification> = ({
    notification,
    onDelete,
    deleteRequest,
}) => {
    const t = useTranslations('notifications');
    const href = getLink(notification);
    return (
        <Stack>
            <MenuItem component='a' href={href}>
                <Stack
                    direction='row'
                    spacing={2}
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: 1,
                    }}
                >
                    <NotificationDescription notification={notification} menuItem />

                    {deleteRequest.isLoading() ? (
                        <CircularProgress />
                    ) : (
                        <Tooltip title={t('delete')}>
                            <IconButton onClick={onDelete}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </MenuItem>
            <Divider />
        </Stack>
    );
};

function getLink(notification: Notification): string {
    switch (notification.type) {
        case NotificationTypes.GAME_COMMENT:
        case NotificationTypes.GAME_COMMENT_REPLY:
            return `/games/${notification.gameCommentMetadata?.cohort}/${notification.gameCommentMetadata?.id}`;
        case NotificationTypes.GAME_REVIEW_COMPLETE:
            return `/games/${notification.gameReviewMetadata?.cohort}/${notification.gameReviewMetadata?.id}`;

        case NotificationTypes.NEW_FOLLOWER:
            return `/profile/${notification.newFollowerMetadata?.username}`;

        case NotificationTypes.TIMELINE_COMMENT:
        case NotificationTypes.TIMELINE_REACTION:
            return `/newsfeed/${notification.timelineCommentMetadata?.owner}/${notification.timelineCommentMetadata?.id}`;

        case NotificationTypes.EXPLORER_GAME:
            if (notification.count === 1)
                return `/games/${notification.explorerGameMetadata?.[0].cohort}/${notification.explorerGameMetadata?.[0].id}`;
            return `/notifications/${encodeURIComponent(notification.id)}`;

        case NotificationTypes.NEW_CLUB_JOIN_REQUEST:
            return `/clubs/${notification.clubMetadata?.id}?view=joinRequests`;

        case NotificationTypes.CLUB_JOIN_REQUEST_APPROVED:
            return `/clubs/${notification.clubMetadata?.id}`;

        case NotificationTypes.CALENDAR_INVITE:
            return `/calendar/availability/${notification.calendarInviteMetadata?.id}`;

        case NotificationTypes.ROUND_ROBIN_START:
            return `/tournaments/round-robin?cohort=${notification.roundRobinStartMetadata?.cohort}`;
    }
}
