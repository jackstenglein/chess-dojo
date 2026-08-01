import { Divider, Stack, Typography } from '@mui/material';
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
                    mb: 3,
                }}
            >
                <Typography variant='h4'>{title}</Typography>
                <Typography
                    variant='h6'
                    sx={{
                        color: 'text.secondary',
                        mb: 1,
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
