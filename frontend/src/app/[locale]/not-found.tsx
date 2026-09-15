import { Container, Typography } from '@mui/material';
import { getTranslations } from 'next-intl/server';

export default async function LocaleNotFound() {
    const t = await getTranslations('errors');

    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <Typography variant='h4'>404</Typography>
            <Typography variant='h6'>{t('notFound')}</Typography>
        </Container>
    );
}
