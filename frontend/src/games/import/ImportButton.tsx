import { Button } from '@mui/material';
import { useTranslations } from 'next-intl';

export interface ImportButtonProps {
    onClick: () => void;
    loading: boolean;
}

export const ImportButton = ({ onClick, loading }: ImportButtonProps) => {
    const t = useTranslations('games.import.importButton');
    return (
        <Button data-testid='import-button' name='import' loading={loading} onClick={onClick}>
            {t('label')}
        </Button>
    );
};
