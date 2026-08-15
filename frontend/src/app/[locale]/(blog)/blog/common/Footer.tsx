import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import logoBlack from './logoBlack.png';

export function Footer({
    utmSource = 'newsletter',
    utmMedium = 'blog',
    utmCampaign,
}: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign: string;
}) {
    const t = useTranslations('blog.footer');
    return (
        <Stack
            sx={{
                alignItems: 'center',
                mt: 4,
            }}
        >
            <a
                href={`https://www.chessdojo.club?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`}
                target='_blank'
                rel='noopener noreferrer'
                style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '30px',
                        maxWidth: '400px',
                        backgroundColor: '#F4931E',
                        padding: '20px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                    }}
                >
                    <Image src={logoBlack} alt='' width={80} height={80} />
                    <Typography
                        color='black'
                        sx={{
                            fontWeight: 'bold',
                            textAlign: 'center',
                        }}
                    >
                        {t('cta')}
                    </Typography>
                </Stack>
            </a>
        </Stack>
    );
}
