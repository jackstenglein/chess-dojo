'use client';

import { logger } from '@/logging/logger';
import { Message } from '@jackstenglein/chess-dojo-common/src/chatBot/api';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, Tooltip } from '@mui/material';
import copy from 'copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders a single message in the chat history with the bot.
 * @param message The message to render.
 */
export function ChatMessage({ message }: { message: Message }) {
    const t = useTranslations('help.chat');
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        try {
            copy(message.content);
            setCopied(true);
        } catch (err) {
            logger.error?.('Failed to copy:', err);
        }
    };

    return (
        <Box
            alignSelf={isUser ? 'flex-end' : 'flex-start'}
            bgcolor={isUser ? 'info.main' : 'divider'}
            color={isUser ? 'info.contrastText' : 'text.primary'}
            px={2}
            py={1.5}
            borderRadius={2}
            maxWidth='80%'
            sx={{ position: 'relative' }}
        >
            {isUser ? (
                message.content
            ) : (
                <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                        }}
                    >
                        <Tooltip title={copied ? t('copied') : t('copyToClipboard')}>
                            <IconButton onClick={handleCopy} size='small'>
                                {copied ? (
                                    <CheckIcon fontSize='inherit' />
                                ) : (
                                    <ContentCopyIcon fontSize='inherit' />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </>
            )}
        </Box>
    );
}
