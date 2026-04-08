import { BlockBoardKeyboardShortcuts } from '@/board/pgn/PgnBoard';
import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { useTranslations } from 'next-intl';
import KeyboardShortcuts from './KeyboardShortcuts';

export interface KeyboardShortcutsDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Callback to open/close the dialog. */
    setOpen: (open: boolean) => void;
}

/**
 * A dialog that renders the full KeyboardShortcuts editor.
 * Accepts open/setOpen for controlled visibility
 */
export const KeyboardShortcutsDialog = ({ open, setOpen }: KeyboardShortcutsDialogProps) => {
    const t = useTranslations('analysisBoard.underboard.settings');
    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            classes={{
                container: BlockBoardKeyboardShortcuts,
            }}
            maxWidth='sm'
            fullWidth
        >
            <DialogTitle sx={{ pr: 6 }}>
                {t('keyboardShortcutsDialogTitle')}
                <IconButton
                    aria-label={t('closeButtonAriaLabel')}
                    onClick={() => setOpen(false)}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <KeyboardShortcuts />
            </DialogContent>
        </Dialog>
    );
};
