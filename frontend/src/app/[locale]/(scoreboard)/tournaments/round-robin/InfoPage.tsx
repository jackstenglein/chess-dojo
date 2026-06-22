import TimeControlTable from '@/components/tournaments/round-robin/TimeControlTable';
import { PawnIcon } from '@/style/ChessIcons';
import Icon from '@/style/Icon';
import { CalendarMonth, EmojiEvents, HelpOutline, MonetizationOn } from '@mui/icons-material';
import GroupIcon from '@mui/icons-material/Group';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import {
    Divider,
    Link,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

const FAQ_KEYS = [
    ['faqQ1', 'faqA1'],
    ['faqQ2', 'faqA2'],
    ['faqQ3', 'faqA3'],
    ['faqQ4', 'faqA4'],
    ['faqQ5', 'faqA5'],
    ['faqQ6', 'faqA6'],
    ['faqQ7', 'faqA7'],
    ['faqQ8', 'faqA8'],
    ['faqQ9', 'faqA9'],
    ['faqQ10', 'faqA10'],
    ['faqQ11', 'faqA11'],
    ['faqQ12', 'faqA12'],
] as const;

const FAQSection = () => {
    const t = useTranslations('tournaments.roundRobin.info');

    const faqs = FAQ_KEYS.map(([q, a]) => ({
        question: t(q),
        answer: t(a),
    }));

    return (
        <Stack spacing={2}>
            <Typography variant='h6' color='text.secondary'>
                <HelpOutline sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('faqHeader')}
            </Typography>
            <List>
                {faqs.map((faq, index) => (
                    <ListItem key={index}>
                        <ListItemText primary={faq.question} secondary={faq.answer} />
                    </ListItem>
                ))}
            </List>
        </Stack>
    );
};

/**
 * Renders the Round Robin info page.
 */
export const InfoPage = () => {
    const t = useTranslations('tournaments.roundRobin.info');

    return (
        <Stack>
            <Typography variant='h5' textAlign='center' color='text.secondary' sx={{ mt: 2 }}>
                {t('welcome')}
                <WavingHandIcon sx={{ verticalAlign: 'middle', ml: 1 }} color='dojoOrange' />
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <MilitaryTechIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('overviewHeader')}
            </Typography>
            <List>
                <ListItem>
                    <ListItemIcon>
                        <GroupIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('overviewCohort')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <PawnIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('overviewSite')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <CalendarMonth sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('overviewSchedule')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <Icon name='Classical' sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('overviewRated')} />
                </ListItem>
            </List>
            <TimeControlTable />
            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <EmojiEvents sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('championsHeader')}
            </Typography>

            <Typography sx={{ mt: 2 }}>{t('championsBody')}</Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <MonetizationOn sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('feeHeader')}
            </Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('feeAmount')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('feeCharged')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('feeNoRefund')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('feePenalty')} />
                </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <LeaderboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('leaderboardHeader')}
            </Typography>

            <Typography sx={{ mt: 2, mb: 1 }}>{t('leaderboardIntro')}</Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardScoring')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardForcedByes')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardWithdraw')} />
                </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <LeaderboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('tiebreaksHeader')}
            </Typography>

            <Typography sx={{ mt: 2, mb: 1 }}>
                {t.rich('tiebreaksBody', {
                    link: (chunks) => (
                        <Link
                            href='https://en.wikipedia.org/wiki/Sonneborn%E2%80%93Berger_score'
                            target='_blank'
                            rel='noopener'
                        >
                            {chunks}
                        </Link>
                    ),
                })}
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant='h6' color='text.secondary'>
                <NotInterestedIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('antiCheatHeader')}
            </Typography>

            <Typography sx={{ mt: 2, mb: 1 }}>{t('antiCheatIntro')}</Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('antiCheatBanned')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('antiCheatAdmit')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('antiCheatTracked')} />
                </ListItem>
            </List>

            <Divider sx={{ my: 4 }} />

            <FAQSection />
        </Stack>
    );
};
