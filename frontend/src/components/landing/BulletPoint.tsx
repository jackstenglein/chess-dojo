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
    const { sx: rootSx, ...rootProps } = slotProps?.root ?? {};
    const { sx: titleSx, ...titleProps } = slotProps?.title ?? {};
    const { sx: descriptionSx, ...descriptionProps } = slotProps?.description ?? {};

    return (
        <Stack
            direction='row'
            {...rootProps}
            sx={{
                gap: 1.5,
                ...rootSx,
            }}
        >
            {icon}

            <Stack sx={{ gap: 0.75 }}>
                {title && (
                    <Typography
                        {...titleProps}
                        sx={{
                            textTransform: 'uppercase',
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontWeight: '600',
                            fontSize: '1.375rem',
                            letterSpacing: '2%',
                            lineHeight: 1,
                            ...titleSx,
                        }}
                    >
                        {title}
                    </Typography>
                )}

                {description && (
                    <Typography
                        {...descriptionProps}
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlow),
                            fontSize: '1.1875rem',
                            lineHeight: '1.9375rem',
                            ...descriptionSx,
                        }}
                    >
                        {description}
                    </Typography>
                )}
            </Stack>
        </Stack>
    );
}
