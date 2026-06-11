import { Button } from '@mui/material';

export interface ImportButtonProps {
    onClick: () => void;
    loading: boolean;
}

export const ImportButton = ({ onClick, loading }: ImportButtonProps) => (
    <Button data-testid='import-button' name='import' loading={loading} onClick={onClick}>
        Import
    </Button>
);
