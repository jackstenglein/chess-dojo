import { BlockBoardKeyboardShortcuts } from '@/board/pgn/PgnBoard';
import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import KeyboardShortcuts from './KeyboardShortcuts';

export interface ViewKeyboardShortcutsDialogProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Callback to open/close the dialog. */
    setOpen: (open: boolean) => void;
}

/**
 * A dialog that renders the full KeyboardShortcuts editor.
 * Accepts open/setOpen for controlled visibility
 */
const ViewKeyboardShortcutsDialog = ({ open, setOpen }: ViewKeyboardShortcutsDialogProps) => {
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
                Keyboard Shortcuts
                <IconButton
                    aria-label='close'
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

export default ViewKeyboardShortcutsDialog;
