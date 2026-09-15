'use client';

import { useCache } from '@/api/cache/Cache';
import { EventType } from '@/database/event';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { Alert, Snackbar } from '@mui/material';
import { useTranslations } from 'next-intl';
import AvailabilityBooker from './AvailabilityBooker';
import CoachingBooker from './CoachingBooker';

const EventBooker = ({ id }: { id: string }) => {
    const t = useTranslations('calendar');
    const router = useRouter();
    const cache = useCache();

    const event = cache.events.get(id || '');

    if (!event) {
        if (cache.isLoading) {
            return <LoadingPage />;
        }

        return (
            <Snackbar
                open
                autoHideDuration={6000}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    variant='filled'
                    severity='error'
                    sx={{ width: '100%' }}
                    onClose={() => router.push('/calendar')}
                >
                    {t('eventNotFoundError')}
                </Alert>
            </Snackbar>
        );
    }

    if (event.type === EventType.Availability) {
        return <AvailabilityBooker availability={event} />;
    } else if (event.type === EventType.Coaching) {
        return <CoachingBooker event={event} />;
    }
    return null;
};

export default EventBooker;
