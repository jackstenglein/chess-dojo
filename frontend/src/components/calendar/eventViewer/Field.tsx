import Icon, { type IconName } from '@/style/Icon';
import { Stack, Typography, TypographyProps } from '@mui/material';
import { ReactNode } from 'react';

interface FieldProps {
    title?: string;
    body?: string | ReactNode;
    showEmptyBody?: boolean;
    iconName?: IconName;
    slotProps?: {
        body?: TypographyProps;
    };
}

const Field: React.FC<FieldProps> = ({ title, body, showEmptyBody, iconName, slotProps }) => {
    if (!title || (!showEmptyBody && !body)) {
        return null;
    }

    return (
        <Stack>
            <Typography
                variant='h6'
                sx={{
                    color: 'text.secondary',
                }}
            >
                <Icon
                    name={iconName}
                    color='primary'
                    sx={{ marginRight: '0.3rem', verticalAlign: 'middle' }}
                    fontSize='small'
                />
                {title}
            </Typography>
            <Typography variant='body1' {...slotProps?.body}>
                {body}
            </Typography>
        </Stack>
    );
};

export default Field;
