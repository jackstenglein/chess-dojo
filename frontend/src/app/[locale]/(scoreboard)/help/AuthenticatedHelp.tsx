'use client';
import SupportTicket from '@/components/help/SupportTicket';
import { Link } from '@/components/navigation/Link';
import { getConfig } from '@/config';
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
import { Fragment, ReactNode, useEffect } from 'react';
import HelpItem from './HelpItem';
import { getFaq, scrollToId } from './UnauthenticatedHelp';
import { getLiveClassesFaq } from './liveClasses';

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
    formLink: (chunks: ReactNode) => (
        <Link href='https://forms.gle/v3JMwxyLQw3LMA1Y9' target='_blank' rel='noreferrer'>
            {chunks}
        </Link>
    ),
    ol: (chunks: ReactNode) => <ol>{chunks}</ol>,
    ul: (chunks: ReactNode) => <ul>{chunks}</ul>,
    li: (chunks: ReactNode) => <li>{chunks}</li>,
};

const AuthenticatedHelp = () => {
    const t = useTranslations('help');
    const { searchParams } = useNextSearchParams();

    const id = searchParams.get('id');
    useEffect(() => {
        if (id) {
            scrollToId(undefined, id);
        }
    }, [id]);

    const faq = getFaq(t);
    const liveClassesFaq = getLiveClassesFaq(t);

    const accountSection = {
        title: t('account.title'),
        items: [
            {
                title: t('account.stuckFreeTitle'),
                content: t('account.stuckFreeContent'),
            },
            {
                title: t('account.cancelTitle'),
                content: t.rich('account.cancelContent', richTags),
            },
            {
                title: t('account.graduateTitle'),
                content: t.rich('account.graduateContent', richTags),
            },
            {
                title: t('account.communicateTitle'),
                content: t.rich('account.communicateContent', richTags),
            },
            {
                title: t('account.switchCohortTitle'),
                content: t.rich('account.switchCohortContent', richTags),
            },
            {
                title: t('account.noTimeDataTitle'),
                content: t('account.noTimeDataContent'),
            },
        ],
    };

    const requirementsSection = {
        title: t('requirements.title'),
        items: [
            {
                title: t('requirements.updateProgressTitle'),
                content: t.rich('requirements.updateProgressContent', richTags),
            },
            {
                title: t('requirements.requirementDetailsTitle'),
                content: t.rich('requirements.requirementDetailsContent', richTags),
            },
            {
                title: t('requirements.updateRatingsTitle'),
                content: t.rich('requirements.updateRatingsContent', richTags),
            },
            {
                title: t('requirements.switchRatingTitle'),
                content: t.rich('requirements.switchRatingContent', richTags),
            },
            {
                title: t('requirements.cantFindSelfTitle'),
                content: t('requirements.cantFindSelfContent'),
            },
            {
                title: t('requirements.findDwzTitle'),
                content: t('requirements.findDwzContent'),
            },
        ],
    };

    const schedulingSection = {
        title: t('scheduling.title'),
        items: [
            {
                title: t('scheduling.bookMeetingTitle'),
                content: t.rich('scheduling.bookMeetingContent', richTags),
            },
            {
                title: t('scheduling.createMeetingTitle'),
                content: t.rich('scheduling.createMeetingContent', richTags),
            },
            {
                title: t('scheduling.editMeetingTitle'),
                content: t.rich('scheduling.editMeetingContent', richTags),
            },
            {
                title: t('scheduling.deleteMeetingTitle'),
                content: t.rich('scheduling.deleteMeetingContent', richTags),
            },
        ],
    };

    const gameDatabaseSection = {
        title: t('gameDatabase.title'),
        items: [
            {
                title: t('gameDatabase.submitGameTitle'),
                content: t.rich('gameDatabase.submitGameContent', richTags),
            },
            {
                title: t('gameDatabase.updateGameTitle'),
                content: t.rich('gameDatabase.updateGameContent', richTags),
            },
            {
                title: t('gameDatabase.deleteGameTitle'),
                content: t.rich('gameDatabase.deleteGameContent', richTags),
            },
            {
                title: t('gameDatabase.cantFindGameTitle'),
                content: t('gameDatabase.cantFindGameContent'),
            },
            {
                title: t('gameDatabase.featuredGamesTitle'),
                content: t.rich('gameDatabase.featuredGamesContent', richTags),
            },
            {
                title: t('gameDatabase.masterGamesTitle'),
                content: t('gameDatabase.masterGamesContent'),
            },
        ],
    };

    const notificationsSection = {
        title: t('helpNotifications.title'),
        items: [
            {
                title: t('helpNotifications.keptTitle'),
                content: t('helpNotifications.keptContent'),
            },
            {
                title: t('helpNotifications.limitTitle'),
                content: t('helpNotifications.limitContent'),
            },
            {
                title: t('helpNotifications.viewAllTitle'),
                content: t.rich('helpNotifications.viewAllContent', richTags),
            },
            {
                title: t('helpNotifications.aggregatedTitle'),
                content: t('helpNotifications.aggregatedContent'),
            },
            {
                title: t('helpNotifications.frequencyTitle'),
                content: t('helpNotifications.frequencyContent'),
            },
        ],
    };

    const newCohortsSection = {
        title: t('newCohorts.title'),
        items: [
            {
                title: t('newCohorts.changeTitle'),
                content: t('newCohorts.changeContent'),
            },
            {
                title: t('newCohorts.whyTitle'),
                content: t('newCohorts.whyContent'),
            },
            {
                title: t('newCohorts.worseTitle'),
                content: t('newCohorts.worseContent'),
            },
            {
                title: t('newCohorts.upCohortTitle'),
                content: t('newCohorts.upCohortContent'),
            },
            {
                title: t('newCohorts.graduateTitle'),
                content: t('newCohorts.graduateContent'),
            },
            {
                title: t('newCohorts.materialTitle'),
                content: t('newCohorts.materialContent'),
            },
            {
                title: t('newCohorts.philosophyTitle'),
                content: t('newCohorts.philosophyContent'),
            },
        ],
    };

    const helpSections = [
        faq,
        liveClassesFaq,
        accountSection,
        requirementsSection,
        schedulingSection,
        gameDatabaseSection,
        notificationsSection,
        newCohortsSection,
    ];

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
                            position: 'sticky',
                            top: 'calc(var(--navbar-height) + 32px)',
                            overflowY: 'scroll',
                            height: 'calc(100vh - var(--navbar-height) - 32px - 32px)',
                        }}
                    >
                        <CardHeader title={t('tableOfContents')} />
                        <CardContent>
                            <Stack>
                                {helpSections.map((section) => (
                                    <Fragment key={section.title}>
                                        <Link
                                            key={section.title}
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
                                    </Fragment>
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
                            <Typography
                                variant='body1'
                                sx={{
                                    mt: 3,
                                }}
                            >
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

                        <Stack>
                            <Typography variant='h5'>{t('tutorials')}</Typography>
                            <Divider />
                            <ul>
                                <li>
                                    <Button
                                        component={Link}
                                        href='/scoreboard?tutorial=true'
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {t('launchScoreboard')}
                                    </Button>
                                </li>
                                <li>
                                    <Button
                                        component={Link}
                                        href='/calendar?tutorial=true'
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {t('launchCalendar')}
                                    </Button>
                                </li>
                                <li>
                                    <Button
                                        component={Link}
                                        href='/games?tutorial=true'
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {t('launchGames')}
                                    </Button>
                                </li>
                            </ul>
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

                                <Stack
                                    spacing={3}
                                    sx={{
                                        mt: 3,
                                    }}
                                >
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

export default AuthenticatedHelp;
