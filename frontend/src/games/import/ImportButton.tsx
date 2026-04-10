import { LoadingButton } from '@mui/lab';
import { useTranslations } from 'next-intl';

export interface ImportButtonProps {
    onClick: () => void;
    loading: boolean;
}

export const ImportButton = ({ onClick, loading }: ImportButtonProps) => {
    const t = useTranslations('games.import.importButton');
    return (
        <LoadingButton
            data-testid='import-button'
            name='import'
            loading={loading}
            onClick={onClick}
        >
            {t('label')}
        </LoadingButton>
    );
};
