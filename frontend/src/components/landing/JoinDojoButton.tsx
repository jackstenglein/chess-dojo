import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { Button, ButtonProps } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../navigation/Link';

export function JoinDojoButton(props: ButtonProps) {
    const { searchParams } = useNextSearchParams();
    const paramsString = searchParams.toString();
    const t = useTranslations('landing');

    return (
        <Button
            variant='contained'
            component={Link}
            href={`/signup${paramsString ? `?${paramsString}` : ''}`}
            color='dojoOrange'
            {...props}
            sx={{
                fontSize: '1rem',
                fontWeight: '600',
                py: '0.75rem',
                px: '1.25rem',
                ...props.sx,
            }}
        >
            {props.children ?? t('joinTheDojo')}
        </Button>
    );
}
