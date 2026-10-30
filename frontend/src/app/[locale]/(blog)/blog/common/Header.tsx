import { Link } from '@/components/navigation/Link';
import { Box, Divider, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import { ReactNode } from 'react';

interface HeaderProps {
    title: ReactNode;
    subtitle: ReactNode;
    image?: string;
    imageCaption?: string;
    hideDivider?: boolean;
}

export const Header = ({ title, subtitle, image, imageCaption, hideDivider }: HeaderProps) => {
    return (
        <div data-testid='blog-header'>
            <Stack
                sx={{
                    mb: 4,
                    pb: 1,
                }}
            >
                <Link
                    href='/blog'
                    underline='none'
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1.5,
                        alignSelf: 'flex-start',
                        mb: 3,
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        '&:hover': { color: 'text.primary' },
                    }}
                >
                    <Box
                        component='span'
                        sx={{ width: 24, height: 3, bgcolor: 'dojoOrange.main', borderRadius: 1 }}
                    />
                    ChessDojo Blog
                </Link>
                <Typography
                    variant='h3'
                    component='h1'
                    sx={{
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        fontSize: { xs: '2rem', sm: '3rem' },
                        mb: 2,
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    variant='h6'
                    sx={{
                        color: 'text.secondary',
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        lineHeight: 1.6,
                    }}
                >
                    {subtitle}
                </Typography>

                {!hideDivider && <Divider />}
            </Stack>

            {image && (
                <Stack
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Image
                        src={image}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                        priority
                    />
                    {imageCaption && (
                        <Typography
                            sx={{
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            {imageCaption}
                        </Typography>
                    )}
                </Stack>
            )}
        </div>
    );
};
