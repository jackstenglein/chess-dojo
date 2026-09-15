import { Link } from '@/components/navigation/Link';
import { usePathname } from '@/i18n/navigation';
import { Alert, Button } from '@mui/material';
import { useTranslations } from 'next-intl';

interface UpsellAlertProps {
    children: string;
}

const UpsellAlert: React.FC<UpsellAlertProps> = ({ children }) => {
    const t = useTranslations('upsell.alert');
    const pathname = usePathname();

    return (
        <Alert
            data-testid='upsell-alert'
            severity='warning'
            variant='filled'
            action={
                <Button
                    component={Link}
                    color='inherit'
                    href={`/prices?redirect=${pathname}`}
                    size='small'
                    sx={{ textAlign: 'center' }}
                >
                    {t('viewOptions')}
                </Button>
            }
        >
            {children}
        </Alert>
    );
};

export default UpsellAlert;
