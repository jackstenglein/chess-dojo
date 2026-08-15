import { Container as MuiContainer } from '@mui/material';
import { ReactNode } from 'react';

export const Container = ({ children }: { children: ReactNode }) => {
    return (
        <MuiContainer maxWidth='sm' sx={{ py: 5 }}>
            {children}
        </MuiContainer>
    );
};
