import { Link } from '@/components/navigation/Link';
import { Container, Typography } from '@mui/material';
import { Metadata } from 'next';
import { useTranslations } from 'next-intl';

export const metadata: Metadata = {
    title: 'Donate to ChessDojo',
    description:
        'Interested in supporting the Dojo without getting a membership? All contributions are greatly appreciated and help keep the Dojo going! We have many ways you can help out.',
};

export default function Page() {
    const t = useTranslations('donate');
    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Typography variant='h4'>{t('title')}</Typography>

            <Typography
                component='div'
                variant='h6'
                sx={{
                    mt: 2,
                }}
            >
                {t('introParagraph')}
                <ul>
                    <li>
                        <Link target='_blank' href='https://buy.stripe.com/aEUbJxaa40Xb84UcN2'>
                            {t('linkSponsorContent')}
                        </Link>
                    </li>
                    <li>
                        <Link target='_blank' href='https://buy.stripe.com/aEUbJxaa40Xb84UcN2'>
                            {t('linkSponsorMembership')}
                        </Link>
                    </li>
                    <li>
                        <Link target='_blank' href='https://buy.stripe.com/aEUbJxaa40Xb84UcN2'>
                            {t('linkSponsorPrizes')}
                        </Link>
                    </li>
                    <li>
                        <Link target='_blank' href='https://buy.stripe.com/aEUbJxaa40Xb84UcN2'>
                            {t('linkPatreon')}
                        </Link>
                    </li>
                    <li>
                        <Link href='/courses'>{t('linkCourses')}</Link>
                    </li>
                    <li>
                        <Link target='_blank' href='https://www.chessdojo.shop/shop'>
                            {t('linkMerch')}
                        </Link>
                    </li>
                    <li>
                        <Link
                            target='_blank'
                            href='https://www.chess.com/membership?ref_id=9504732'
                        >
                            {t('linkChessComReferral')}
                        </Link>
                    </li>
                </ul>
            </Typography>

            <Typography
                component='div'
                variant='h6'
                sx={{
                    mt: 6,
                }}
            >
                {t('freeWaysIntro')}
                <ul>
                    <li>{t('freeClipTwitch')}</li>
                    <li>{t('freeShareVideos')}</li>
                    <li>{t('freeLikeYoutube')}</li>
                    <li>{t('freeVolunteer')}</li>
                </ul>
            </Typography>

            <Typography
                variant='h5'
                sx={{
                    mt: 6,
                }}
            >
                {t('volunteeringHeading')}
            </Typography>
            <Typography
                component='div'
                variant='h6'
                sx={{
                    mt: 1,
                }}
            >
                {t('volunteeringIntro')}
                <ul>
                    <li>{t('volunteerAdmin')}</li>
                    <li>{t('volunteerProgramming')}</li>
                    <li>{t('volunteerContent')}</li>
                </ul>
            </Typography>
        </Container>
    );
}
