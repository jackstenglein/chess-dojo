import { Button } from '@mui/material';

interface ChesscomSignInButtonProps {
    onClick: () => void;
    label?: string;
}

export const ChesscomSignInButton = ({
    onClick,
    label = 'Sign in with Chess.com',
}: ChesscomSignInButtonProps) => (
    <Button
        onClick={onClick}
        data-testid='chesscom-signin-button'
        variant='contained'
        sx={{
            backgroundColor: '#81b64c',
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
                backgroundColor: '#6a9a3c',
                boxShadow: '0 0 3px 3px rgba(66,133,244,0.3)',
            },
        }}
    >
        {label}
    </Button>
);
