import { Link } from '@/components/navigation/Link';
import { InfoOutlined } from '@mui/icons-material';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

/** The panel's notice when a course is open without a task. Nothing is timed or counted here. */
export function StudyBrowseNotice() {
    const t = useTranslations('study');
    return (
        <Stack
            direction='row'
            data-testid='study-browse-notice'
            sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
            }}
        >
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                <InfoOutlined fontSize='small' color='action' />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {t('browse.notice')}
                </Typography>
            </Stack>
            <Button component={Link} href='/study' size='small'>
                {t('browse.toReader')}
            </Button>
        </Stack>
    );
}
