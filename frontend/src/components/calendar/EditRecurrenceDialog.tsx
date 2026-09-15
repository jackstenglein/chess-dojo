'use client';

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { RecurrenceEditScope } from './recurrence';

type PromptResult = RecurrenceEditScope | 'cancel';

/**
 * Prompts whether a recurring time edit applies to this occurrence or all occurrences.
 */
export function useRecurrenceEditPrompt() {
    const t = useTranslations('calendar');
    const [open, setOpen] = useState(false);
    const resolveRef = useRef<(result: PromptResult) => void>(null);

    const prompt = useCallback(() => {
        return new Promise<PromptResult>((resolve) => {
            resolveRef.current = resolve;
            setOpen(true);
        });
    }, []);

    const close = useCallback((result: PromptResult) => {
        setOpen(false);
        resolveRef.current?.(result);
        resolveRef.current = null;
    }, []);

    const dialog = (
        <Dialog
            open={open}
            onClose={() => close('cancel')}
            data-testid='edit-recurrence-dialog'
            sx={{
                zIndex: 999_999, // Required due to calendar library loading z-Index
            }}
        >
            <DialogTitle>{t('editRecurringTitle')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{t('editRecurringDescription')}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
                <Button onClick={() => close('cancel')} color='inherit'>
                    {t('cancel')}
                </Button>
                <Button
                    onClick={() => close('this')}
                    variant='outlined'
                    data-testid='edit-recurrence-this'
                >
                    {t('editThisOccurrence')}
                </Button>
                <Button
                    onClick={() => close('all')}
                    variant='contained'
                    data-testid='edit-recurrence-all'
                >
                    {t('editAllOccurrences')}
                </Button>
            </DialogActions>
        </Dialog>
    );

    return { prompt, dialog };
}
