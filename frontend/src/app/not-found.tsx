import { Layout } from '@/legacy/Layout';
import { Container, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

export default function NotFound() {
    const t = useTranslations('errors');

    return (
        <Layout>
            <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
                <Typography variant='h4'>404</Typography>
                <Typography variant='h6'>{t('notFound')}</Typography>
            </Container>
        </Layout>
    );
}
