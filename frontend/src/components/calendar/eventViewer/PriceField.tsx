import { Stack, Typography } from '@mui/material';

import { displayPrice } from '@/app/[locale]/(scoreboard)/courses/(list)/CourseListItem';
import { useAuth } from '@/auth/Auth';
import { Event } from '@/database/event';
import { useTranslations } from 'next-intl';

const PriceField: React.FC<{ event: Event }> = ({ event }) => {
    const t = useTranslations('calendar');
    const user = useAuth().user;

    if (!event.coaching) {
        return null;
    }

    const isParticipant = Boolean(event.participants[user?.username || '']);
    const fullPrice = event.coaching.fullPrice;
    const currentPrice = event.coaching.currentPrice;
    const percentOff =
        currentPrice > 0 ? Math.round(((fullPrice - currentPrice) / fullPrice) * 100) : 0;

    return (
        <Stack>
            <Typography variant='subtitle2' color='text.secondary'>
                {t('price')}
            </Typography>
            {isParticipant ? (
                <Typography>{t('alreadyBooked')}</Typography>
            ) : (
                <Stack direction='row' spacing={1} alignItems='baseline'>
                    <Typography
                        variant='body1'
                        sx={{
                            color: percentOff > 0 ? 'error.main' : undefined,
                            textDecoration: percentOff > 0 ? 'line-through' : undefined,
                        }}
                    >
                        ${displayPrice(fullPrice / 100)}
                    </Typography>

                    {percentOff > 0 && (
                        <>
                            <Typography variant='body1' color='success.main'>
                                ${displayPrice(currentPrice / 100)}
                            </Typography>

                            <Typography variant='body2' color='text.secondary'>
                                (-{percentOff}%)
                            </Typography>
                        </>
                    )}
                </Stack>
            )}
        </Stack>
    );
};

export default PriceField;
