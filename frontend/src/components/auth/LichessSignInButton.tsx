import { Button } from '@mui/material';

interface LichessSignInButtonProps {
    onClick: () => void;
    label?: string;
}

export const LichessSignInButton = ({
    onClick,
    label = 'Sign in with Lichess',
}: LichessSignInButtonProps) => (
    <Button
        onClick={onClick}
        data-testid='lichess-signin-button'
        variant='contained'
        sx={{
            backgroundColor: '#629924',
            color: '#ffffff',
            textTransform: 'none',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            height: '40px',
            px: 2,
            borderRadius: '2px',
            boxShadow: '0 2px 4px 0 rgba(0,0,0,0.25)',
            '&:hover': {
                backgroundColor: '#4e7a1c',
                boxShadow: '0 0 3px 3px rgba(66,133,244,0.3)',
            },
        }}
    >
        {label}
    </Button>
);
