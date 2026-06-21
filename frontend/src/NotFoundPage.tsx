import { Container, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const NotFoundPage = () => {
    const t = useTranslations('errors');

    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <Typography variant='h4'>404</Typography>
            <Typography variant='h6'>{t('notFound')}</Typography>
        </Container>
    );
};

export default NotFoundPage;
