import { Link } from '@/components/navigation/Link';
import { Alert, Button } from '@mui/material';
import { usePathname } from 'next/navigation';

interface UpsellAlertProps {
    children: string;
}

const UpsellAlert: React.FC<UpsellAlertProps> = ({ children }) => {
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
                    View Options
                </Button>
            }
        >
            {children}
        </Alert>
    );
};

export default UpsellAlert;
