import { Check, ContentPaste } from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import copy from 'copy-to-clipboard';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { useChess } from '../../PgnBoard';

const StartButtons = () => {
    const t = useTranslations('analysisBoard.boardButtons');
    const { chess } = useChess();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [copied, setCopied] = useState('');

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const onCopy = (name: string) => {
        setCopied(name);
        handleClose();
        setTimeout(() => {
            setCopied('');
        }, 2500);
    };

    const onCopyUrl = () => {
        const url = new URL(window.location.href);
        const fen = chess?.fen();
        if (fen) {
            url.searchParams.set('fen', fen);
        }
        copy(url.href);
        onCopy('url');
    };

    const onCopyFen = () => {
        copy(chess?.fen() || '');
        onCopy('fen');
    };

    const onCopyPGN = () => {
        copy(chess?.renderPgn() || '');
        onCopy('pgn');
    };

    return (
        <Stack direction='row'>
            <Tooltip title={t('copy')}>
                <IconButton onClick={handleClick}>
                    {copied ? (
                        <Check sx={{ color: 'text.secondary' }} />
                    ) : (
                        <ContentPaste sx={{ color: 'text.secondary' }} />
                    )}
                </IconButton>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                <MenuItem onClick={onCopyUrl}>{t('copyUrl')}</MenuItem>
                <MenuItem onClick={onCopyFen}>{t('copyFen')}</MenuItem>
                <MenuItem onClick={onCopyPGN}>{t('copyPgn')}</MenuItem>
            </Menu>
        </Stack>
    );
};

export default StartButtons;
