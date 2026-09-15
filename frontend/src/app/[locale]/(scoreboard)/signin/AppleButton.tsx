import { Apple } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';

export function AppleButton(props: ButtonProps) {
    return (
        <Button
            startIcon={<Apple />}
            variant='contained'
            color='apple'
            sx={{
                textTransform: 'none',
                width: 1,
                height: '50px',
                fontSize: '16px',
                transform: 'scale(1.1)',
                transformOrigin: 'center',
            }}
            {...props}
        >
            {props.children || 'Sign in with Apple'}
        </Button>
    );
}
