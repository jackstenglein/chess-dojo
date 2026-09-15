'use client';

import { FacebookOutlined, Link, Reddit, Share, Twitter } from '@mui/icons-material';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

function objectToGetParams(object: Record<string, string | number | undefined | null>) {
    const params = Object.entries(object)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

    return params.length > 0 ? `?${params.join('&')}` : '';
}

interface ShareButtonProps {
    title: string;
    href: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ title, href }) => {
    const t = useTranslations('blog.share');
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const onShare = async (platform: string) => {
        const fullHref = `${window.location.protocol}//${window.location.host}${href}`;
        let link = '';

        switch (platform) {
            case 'facebook':
                link =
                    `https://www.facebook.com/sharer/sharer.php` +
                    objectToGetParams({
                        u: fullHref,
                        hashtag: 'ChessDojo',
                    });
                break;
            case 'twitter':
                link =
                    `https://twitter.com/intent/tweet` +
                    objectToGetParams({
                        url: fullHref,
                        text: title,
                        hashtags: 'ChessDojo',
                        related: '@chessdojo',
                    });
                break;
            case 'reddit':
                link =
                    `https://www.reddit.com/submit` + objectToGetParams({ url: fullHref, title });
                break;
            case 'copy':
                await navigator.clipboard.writeText(fullHref);
                break;
        }

        if (link) {
            window.open(link, '_blank', 'noopener');
        }
        setAnchorEl(null);
    };

    return (
        <>
            <Button
                startIcon={<Share fontSize='small' />}
                onClick={(e) => setAnchorEl(e.currentTarget)}
            >
                {t('share')}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => onShare('facebook')}>
                    <ListItemIcon>
                        <FacebookOutlined />
                    </ListItemIcon>
                    <ListItemText primary='Facebook' />
                </MenuItem>
                <MenuItem onClick={() => onShare('twitter')}>
                    <ListItemIcon>
                        <Twitter />
                    </ListItemIcon>
                    <ListItemText primary='Twitter' />
                </MenuItem>
                <MenuItem onClick={() => onShare('reddit')}>
                    <ListItemIcon>
                        <Reddit />
                    </ListItemIcon>
                    <ListItemText primary='Reddit' />
                </MenuItem>
                <MenuItem onClick={() => onShare('copy')}>
                    <ListItemIcon>
                        <Link />
                    </ListItemIcon>
                    <ListItemText primary={t('copyLink')} />
                </MenuItem>
            </Menu>
        </>
    );
};

export default ShareButton;
