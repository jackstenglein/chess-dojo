import { Typography } from '@mui/material';
import { ReactNode } from 'react';

export const Question = ({ children }: { children: ReactNode }) => {
    return (
        <Typography fontWeight='bold' sx={{ mt: 3, mb: 1 }}>
            {children}
        </Typography>
    );
};
