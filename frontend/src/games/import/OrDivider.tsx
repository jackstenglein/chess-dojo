import { Divider } from '@mui/material';
import { useTranslations } from 'next-intl';

interface OrDividerProps {
    header?: string;
}

export const OrDivider = ({ header }: OrDividerProps) => {
    const t = useTranslations('games.import.orDivider');
    return (
        <Divider sx={{ color: 'text.secondary', mt: 2, mb: 2 }}>
            {header ?? t('defaultHeader')}
        </Divider>
    );
};
