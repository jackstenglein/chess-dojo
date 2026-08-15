import { Stack, Typography } from '@mui/material';
import { PropsWithChildren } from 'react';

interface HelpItemProps {
    title: string;
}

const HelpItem: React.FC<PropsWithChildren<HelpItemProps>> = ({ title, children }) => {
    return (
        <Stack
            spacing={0.5}
            id={title.toLowerCase().replaceAll(' ', '-')}
            sx={{
                scrollMarginTop: '88px',
            }}
        >
            <Typography variant='h6'>{title}</Typography>
            <Typography variant='body1' component='div'>
                {children}
            </Typography>
        </Stack>
    );
};

export default HelpItem;
