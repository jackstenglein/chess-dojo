import { Typography } from '@mui/material';
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
} from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';

export function ScoreboardToolbar() {
    const t = useTranslations('scoreboard');

    return (
        <GridToolbarContainer>
            <Typography
                variant='caption'
                color='text.secondary'
                sx={{ ml: 0.5, mt: 0.5, flexGrow: 1 }}
            >
                {t('tip')}
            </Typography>

            <GridToolbarColumnsButton />
            <GridToolbarDensitySelector />
            <GridToolbarFilterButton />
        </GridToolbarContainer>
    );
}
