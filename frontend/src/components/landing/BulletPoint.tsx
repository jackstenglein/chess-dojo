import { fontFamily } from '@/style/font';
import { ArrowForward } from '@mui/icons-material';
import { Stack, StackProps, Typography, TypographyProps } from '@mui/material';
import { barlow, barlowCondensed } from './fonts';

import type { JSX } from 'react';

function DefaultIcon() {
    return <ArrowForward color='darkBlue' />;
}

interface BulletPointProps {
    title?: string;
    description?: string;
    icon?: JSX.Element;
    slotProps?: {
        root?: StackProps;
        title?: TypographyProps;
        description?: TypographyProps;
    };
}

export function BulletPoint({
    title,
    description,
    icon = <DefaultIcon />,
    slotProps,
}: BulletPointProps) {
    return (
        <Stack direction='row' gap={1.5} {...slotProps?.root}>
            {icon}

            <Stack gap={0.75}>
                {title && (
                    <Typography
                        sx={{
                            textTransform: 'uppercase',
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontWeight: '600',
                            fontSize: '1.375rem',
                            letterSpacing: '2%',
                            lineHeight: 1,
                        }}
                        {...slotProps?.title}
                    >
                        {title}
                    </Typography>
                )}

                {description && (
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlow),
                            fontSize: '1.1875rem',
                            lineHeight: '1.9375rem',
                        }}
                        {...slotProps?.description}
                    >
                        {description}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
}
