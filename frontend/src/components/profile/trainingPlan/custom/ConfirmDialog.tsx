import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    content: string;
    onConfirm: () => void;
}

/** A confirmation dialog for destructive actions on plans and buckets. */
export function ConfirmDialog({ open, onClose, title, content, onConfirm }: ConfirmDialogProps) {
    const t = useTranslations('profile.trainingPlan.customPlan');
    const tCommon = useTranslations('profile.trainingPlan.common');

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{content}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tCommon('cancel')}</Button>
                <Button
                    color='error'
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    data-testid='plan-confirm-delete-button'
                >
                    {t('delete')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
