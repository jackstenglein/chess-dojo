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
            <Stack mb={3}>
                <Typography variant='h4'>{title}</Typography>
                <Typography variant='h6' color='text.secondary' sx={{ mb: 1 }}>
                    {subtitle}
                </Typography>

                {!hideDivider && <Divider />}
            </Stack>

            {image && (
                <Stack alignItems='center'>
                    <Image
                        src={image}
                        alt=''
                        style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                        priority
                    />
                    {imageCaption && (
                        <Typography textAlign='center' color='text.secondary'>
                            {imageCaption}
                        </Typography>
                    )}
                </Stack>
            )}
        </div>
    );
};
