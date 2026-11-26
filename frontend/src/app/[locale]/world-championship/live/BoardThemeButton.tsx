'use client';

import ViewerSettings, {
    ViewerSetting,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Tooltip } from '@mui/material';
import { useState } from 'react';

/**
 * A gear by the move buttons that opens the board and piece styles. They are
 * the same settings the rest of the site uses, so a change here also applies
 * to the game viewer, and the board changes at once.
 */
export function BoardThemeButton() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Tooltip title='Board settings'>
                <IconButton size='small' aria-label='Board settings' onClick={() => setOpen(true)}>
                    <SettingsIcon />
                </IconButton>
            </Tooltip>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth='xs'
                fullWidth
                // The board stays in view, so a change can be seen as it is made.
                slotProps={{ backdrop: { invisible: true } }}
            >
                <DialogTitle sx={{ pr: 6 }}>
                    Board settings
                    <IconButton
                        aria-label='Close'
                        onClick={() => setOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack sx={{ pt: 1 }}>
                        <ViewerSettings
                            compact
                            enabledSettings={{
                                [ViewerSetting.BoardStyle]: true,
                                [ViewerSetting.PieceStyle]: true,
                            }}
                        />
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
}
