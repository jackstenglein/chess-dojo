'use client';

import SupportTicket from '@/components/help/SupportTicket';
import SendIcon from '@mui/icons-material/Send';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { Box, Dialog, DialogContent, IconButton, Paper, TextField, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Renders the input field for sending a message to the chat bot.
 * @param onSend Callback invoked with the message content when the user clicks send.
 */
export function ChatInput({ onSend }: { onSend: (message: string) => void }) {
    const t = useTranslations('help.chat');
    const [input, setInput] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
        setInput('');
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <Box
            py={2}
            px={1}
            display='flex'
            justifyContent='center'
            sx={{ position: 'sticky', bottom: 0 }}
        >
            <Paper
                elevation={3}
                component='form'
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 'md',
                    borderRadius: 10,
                    px: 2,
                    py: 0.5,
                }}
            >
                <TextField
                    variant='standard'
                    fullWidth
                    placeholder={t('placeholder')}
                    slotProps={{
                        input: {
                            disableUnderline: true,
                            sx: { px: 1, py: 1 },
                        },
                    }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Tooltip title={t('sendMessage')}>
                    <IconButton color='primary' onClick={handleSend}>
                        <SendIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('openSupportTicket')}>
                    <IconButton color='primary' onClick={handleOpenModal}>
                        <SupportAgentIcon />
                    </IconButton>
                </Tooltip>
            </Paper>

            <Dialog
                open={isModalOpen}
                onClose={handleCloseModal}
                aria-labelledby='support-ticket-modal'
                aria-describedby='support-ticket-form'
                fullWidth
            >
                <DialogContent>
                    <SupportTicket />
                </DialogContent>
            </Dialog>
        </Box>
    );
}
