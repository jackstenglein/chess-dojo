'use client';

import { useAuth } from '@/auth/Auth';
import { getConfig } from '@/config';
import { Check, ContentCopy, Share } from '@mui/icons-material';
import {
    Button,
    IconButton,
    List,
    ListItem,
    Popover,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import { useFiltersContext } from './CalendarFilters';

export default function CalendarShareMenu() {
    const t = useTranslations('calendar');
    const { user } = useAuth();
    const filters = useFiltersContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [copied, setCopied] = useState(false);
    const menuId = useId();
    const open = Boolean(anchorEl);

    const icsUrl = useMemo(() => {
        if (!user?.username) {
            return '';
        }

        const params = new URLSearchParams();
        if (filters.sessions.length > 0) {
            params.set('sessions', filters.sessions.join(','));
        }
        if (filters.types.length > 0) {
            params.set('types', filters.types.join(','));
        }

        const query = params.toString();
        const base = `${getConfig().api.baseUrl}/public/calendar/${user.username}/ics`;
        return query ? `${base}?${query}` : base;
    }, [user?.username, filters.sessions, filters.types]);

    if (!user?.username) {
        return null;
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(icsUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <Tooltip title={t('share')}>
                <IconButton
                    data-testid='calendar-share-button'
                    aria-label={t('share')}
                    aria-controls={open ? menuId : undefined}
                    aria-haspopup='true'
                    aria-expanded={open ? 'true' : undefined}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size='small'
                >
                    <Share />
                </IconButton>
            </Tooltip>

            <Popover
                id={menuId}
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { p: 2, width: 340 },
                    },
                }}
            >
                <Stack spacing={1.5}>
                    <Typography variant='subtitle1' fontWeight='bold'>
                        {t('shareMenuTitle')}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {t('shareGoogleIntro')}
                    </Typography>
                    <List
                        dense
                        sx={{
                            listStyleType: 'decimal',
                            pl: 2.5,
                            py: 0,
                            '& .MuiListItem-root': {
                                display: 'list-item',
                                px: 0,
                                py: 0.25,
                            },
                        }}
                    >
                        <ListItem>
                            <Typography variant='body2'>{t('shareGoogleStep1')}</Typography>
                        </ListItem>
                        <ListItem>
                            <Typography variant='body2'>{t('shareGoogleStep2')}</Typography>
                        </ListItem>
                        <ListItem>
                            <Typography variant='body2'>{t('shareGoogleStep3')}</Typography>
                        </ListItem>
                        <ListItem>
                            <Typography variant='body2'>{t('shareGoogleStep4')}</Typography>
                        </ListItem>
                        <ListItem>
                            <Typography variant='body2'>{t('shareGoogleStep5')}</Typography>
                        </ListItem>
                    </List>
                    <Button
                        variant='contained'
                        size='small'
                        startIcon={copied ? <Check /> : <ContentCopy />}
                        onClick={handleCopy}
                        color={copied ? 'success' : 'primary'}
                    >
                        {copied ? t('icsLinkCopied') : t('copyIcsLink')}
                    </Button>
                </Stack>
            </Popover>
        </>
    );
}
