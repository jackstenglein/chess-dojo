import { Box, Container, ContainerProps, SxProps } from '@mui/material';
import Image from 'next/image';
import { CSSProperties, type JSX } from 'react';

export function BackgroundImageContainer({
    id,
    src,
    background,
    children,
    slotProps,
}: {
    id?: string;
    src: string;
    background: string;
    children: JSX.Element | JSX.Element[];
    slotProps?: {
        image?: {
            style?: CSSProperties;
            priority?: boolean;
        };
        container?: {
            sx?: SxProps;
            maxWidth?: ContainerProps['maxWidth'];
        };
    };
}) {
    return (
        <Box
            id={id}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                background,
                scrollMarginTop: { xs: 0, md: 'var(--navbar-height)' },
            }}
        >
            <Image
                alt=''
                src={src}
                style={{
                    objectFit: 'cover',
                    opacity: 0.07,
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    ...slotProps?.image?.style,
                }}
                priority={slotProps?.image?.priority}
            />

            <Container
                maxWidth={slotProps?.container?.maxWidth ?? 'lg'}
                sx={{ py: '5.5rem', position: 'relative', zIndex: 1, ...slotProps?.container?.sx }}
            >
                {children}
            </Container>
        </Box>
    );
}
