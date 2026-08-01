import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useNotifications } from '@/api/cache/Cache';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
    Badge,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    MenuList,
    Stack,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { NotificationListItem } from './NotificationListItem';

const NotificationButton = () => {
    const { notifications, clearNotifications } = useNotifications();
    const api = useApi();
    const clearRequest = useRequest();
    const t = useTranslations('notifications');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const onClearAll = () => {
        clearRequest.onStart();
        api.deleteAllNotifications()
            .then(() => {
                clearNotifications();
                clearRequest.onSuccess();
                handleClose();
            })
            .catch((err) => {
                clearRequest.onFailure(err);
            });
    };

    return (
        <>
            <RequestSnackbar request={clearRequest} />
            <Tooltip title={t('title')}>
                <IconButton
                    data-testid='Notifications'
                    onClick={handleOpen}
                    sx={{ color: 'white' }}
                >
                    <Badge badgeContent={notifications.length} color='secondary' overlap='circular'>
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            </Tooltip>
            <Menu
                id='notifications-menu'
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <MenuList>
                    {notifications.length > 0 && [
                        <Stack
                            key='stack'
                            direction='row'
                            sx={{
                                justifyContent: 'center',
                                pb: 1,
                            }}
                        >
                            {clearRequest.isLoading() ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Button
                                    data-testid='clear-all-notifications'
                                    size='small'
                                    onClick={onClearAll}
                                >
                                    {t('clearAll')}
                                </Button>
                            )}
                        </Stack>,
                        <Divider key='divider' />,
                    ]}
                    {notifications.map((n) => (
                        <NotificationListItem key={n.id} notification={n} menuItem />
                    ))}
                    {notifications.length === 0 && (
                        <MenuItem onClick={handleClose}>{t('empty')}</MenuItem>
                    )}
                </MenuList>
            </Menu>
        </>
    );
};

export default NotificationButton;
