'use client';

import SupportTicket from '@/components/help/SupportTicket';
import { Link } from '@/components/navigation/Link';
import { getConfig } from '@/config';
import { RatingSystem, formatRatingSystem } from '@/database/user';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { SmartToy } from '@mui/icons-material';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Divider,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, { ReactNode, useEffect } from 'react';
import HelpItem from './HelpItem';
import { getLiveClassesFaq } from './liveClasses';

const { Custom, Custom2, Custom3, ...ratingSystems } = RatingSystem;
const config = getConfig();

const richTags = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    profileLink: (chunks: ReactNode) => <Link href='/profile'>{chunks}</Link>,
    profileEditLink: (chunks: ReactNode) => <Link href='/profile/edit'>{chunks}</Link>,
    calendarLink: (chunks: ReactNode) => <Link href='/calendar'>{chunks}</Link>,
    gamesLink: (chunks: ReactNode) => <Link href='/games'>{chunks}</Link>,
    newsfeedLink: (chunks: ReactNode) => <Link href='/newsfeed'>{chunks}</Link>,
    notificationsLink: (chunks: ReactNode) => <Link href='/notifications'>{chunks}</Link>,
    gameSubmitLink: (chunks: ReactNode) => <Link href='/games/submit'>{chunks}</Link>,
    discordLink: (chunks: ReactNode) => (
        <Link href={config.discord.url} target='_blank' rel='noopener'>
            {chunks}
        </Link>
    ),
    oldSiteLink: (chunks: ReactNode) => (
        <Link href='https://chessdojo.shop' target='_blank' rel='noopener'>
            {chunks}
        </Link>
    ),
    formLink: (chunks: ReactNode) => (
        <Link href='https://forms.gle/v3JMwxyLQw3LMA1Y9' target='_blank' rel='noreferrer'>
            {chunks}
        </Link>
    ),
    ol: (chunks: ReactNode) => <ol>{chunks}</ol>,
    ul: (chunks: ReactNode) => <ul>{chunks}</ul>,
    li: (chunks: ReactNode) => <li>{chunks}</li>,
};

export function getFaq(t: ReturnType<typeof useTranslations<'help'>>) {
    return {
        title: t('faq.title'),
        items: [
            {
                title: t('faq.foundationTitle'),
                content: t.rich('faq.foundationContent', richTags),
            },
            {
                title: t('faq.howWorksTitle'),
                content: t('faq.howWorksContent'),
            },
            {
                title: t('faq.communicateTitle'),
                content: t.rich('faq.communicateContent', richTags),
            },
            {
                title: t('faq.studyFrequencyTitle'),
                content: t('faq.studyFrequencyContent'),
            },
            {
                title: t('faq.graduateRequirementTitle'),
                content: t('faq.graduateRequirementContent'),
            },
            {
                title: t('faq.classicalRequirementsTitle'),
                content: t.rich('faq.classicalRequirementsContent', richTags),
            },
            {
                title: t('faq.longGamesTitle'),
                content: t('faq.longGamesContent'),
            },
        ],
    };
}

export function scrollToId(e: React.MouseEvent | undefined, id: string) {
    e?.preventDefault();
    e?.stopPropagation();

    id = id.toLowerCase().replaceAll(' ', '-');
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView();
    }
}

const UnauthenticatedHelp = () => {
    const t = useTranslations('help');
    const tRating = useTranslations('enums.ratingSystem');
    const { searchParams } = useNextSearchParams();

    const id = searchParams.get('id');
    useEffect(() => {
        if (id) {
            scrollToId(undefined, id);
        }
    }, [id]);

    const faq = getFaq(t);
    const liveClassesFaq = getLiveClassesFaq(t);

    const unauthAccount = {
        title: t('unauthenticated.accountTitle'),
        items: [
            {
                title: t('unauthenticated.stuckFreeTitle'),
                content: t.rich('unauthenticated.stuckFreeContent', richTags),
            },
            {
                title: t('unauthenticated.noRatingTitle'),
                content: (
                    <>
                        {t('unauthenticated.noRatingPrefix')}
                        <ul>
                            {Object.values(ratingSystems).map((rs) => (
                                <li key={rs}>{formatRatingSystem(rs, tRating)}</li>
                            ))}
                        </ul>
                        {t('unauthenticated.noRatingFooter')}
                    </>
                ),
            },
        ],
    };

    const helpSections = [faq, liveClassesFaq, unauthAccount];

    return (
        <Container maxWidth='xl' sx={{ py: 4 }}>
            <Grid container columnSpacing={4}>
                <Grid
                    sx={{ display: { xs: 'none', md: 'initial' } }}
                    size={{
                        md: 3,
                    }}
                >
                    <Card
                        variant='outlined'
                        sx={{
                            '--margin': '32px',
                            position: 'sticky',
                            top: 'calc(var(--navbar-height) + var(--margin))',
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - var(--navbar-height) - 2 * var(--margin))',
                        }}
                    >
                        <CardHeader title={t('tableOfContents')} />
                        <CardContent>
                            <Stack>
                                {helpSections.map((section) => (
                                    <React.Fragment key={section.title}>
                                        <Link
                                            href={`#${section.title}`}
                                            onClick={(e) => scrollToId(e, section.title)}
                                        >
                                            {section.title}
                                        </Link>
                                        <ul style={{ marginTop: 0 }}>
                                            {section.items.map((item) => (
                                                <li key={item.title}>
                                                    <Link
                                                        href={`#${item.title}`}
                                                        onClick={(e) => scrollToId(e, item.title)}
                                                    >
                                                        {item.title}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </React.Fragment>
                                ))}
                                <Link
                                    href='#support-ticket'
                                    onClick={(e) => scrollToId(e, 'support-ticket')}
                                >
                                    {t('openSupportTicket')}
                                </Link>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid
                    id='scroll-parent'
                    size={{
                        md: 9,
                    }}
                >
                    <Stack spacing={5}>
                        <Stack>
                            <Typography variant='h4'>{t('pageTitle')}</Typography>
                            <Divider />
                            <Typography variant='body1' mt={3}>
                                {t.rich('pageDescription', {
                                    helpChatLink: (chunks) => (
                                        <strong>
                                            <Link href='/help/chat'>{chunks}</Link>
                                        </strong>
                                    ),
                                })}
                            </Typography>
                            <Button
                                variant='contained'
                                color='primary'
                                startIcon={<SmartToy />}
                                component={Link}
                                href='/help/chat'
                                sx={{ mt: 2, alignSelf: 'start' }}
                            >
                                {t('askDojoAI')}
                            </Button>
                        </Stack>

                        {helpSections.map((section) => (
                            <Stack
                                key={section.title}
                                id={section.title.toLowerCase().replaceAll(' ', '-')}
                                sx={{
                                    scrollMarginTop: 'calc(var(--navbar-height) + 8px)',
                                }}
                            >
                                <Typography variant='h5'>{section.title}</Typography>
                                <Divider />

                                <Stack spacing={3} mt={3}>
                                    {section.items.map((item) => (
                                        <HelpItem key={item.title} title={item.title}>
                                            {item.content}
                                        </HelpItem>
                                    ))}
                                </Stack>
                            </Stack>
                        ))}

                        <SupportTicket />
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    );
};

export default UnauthenticatedHelp;
