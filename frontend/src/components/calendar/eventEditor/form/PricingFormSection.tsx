import { InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { UseEventEditorResponse } from '../useEventEditor';

export function PricingFormSection({
    editor,
    fullPriceOpts,
    currentPriceOpts,
}: {
    editor: UseEventEditorResponse;
    fullPriceOpts?: { helperText?: string };
    currentPriceOpts?: { helperText?: string };
}) {
    const t = useTranslations('calendar');
    const percentOff = Math.round(
        ((parseFloat(editor.fullPrice) - parseFloat(editor.currentPrice)) /
            parseFloat(editor.fullPrice)) *
            100,
    );
    return (
        <Stack spacing={3} mt={2}>
            <TextField
                fullWidth
                placeholder={t('fullPrice')}
                variant='outlined'
                value={editor.fullPrice}
                onChange={(e) => editor.setFullPrice(e.target.value)}
                error={Boolean(editor.errors.fullPrice)}
                helperText={editor.errors.fullPrice || fullPriceOpts?.helperText}
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                    },
                }}
            />
            <TextField
                fullWidth
                placeholder={t('salePrice')}
                variant='outlined'
                value={editor.currentPrice}
                onChange={(e) => editor.setCurrentPrice(e.target.value)}
                error={Boolean(editor.errors.currentPrice)}
                helperText={
                    editor.errors.currentPrice || currentPriceOpts?.helperText || t('salePriceHelp')
                }
                slotProps={{
                    input: {
                        startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                    },
                }}
            />

            {editor.fullPrice !== '' && editor.currentPrice !== '' && !isNaN(percentOff) && (
                <Typography>{t('percentOff', { percent: percentOff })}</Typography>
            )}
        </Stack>
    );
}
