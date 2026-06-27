import { getConfig } from '@/config';
import { CalendarMonth } from '@mui/icons-material';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import PublicIcon from '@mui/icons-material/Public';
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
import { SiChessdotcom, SiDiscord, SiLichess } from 'react-icons/si';

const InfoTab = () => {
    const config = getConfig();
    const t = useTranslations('tournaments.liga.info');
    return (
        <Stack spacing={2}>
            <Typography variant='h5' textAlign='center' color='text.secondary'>
                {t('welcome')}
                <WavingHandIcon sx={{ verticalAlign: 'middle', ml: 1 }} color='dojoOrange' />
            </Typography>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <MilitaryTechIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('infoHeader')}
            </Typography>
            <List>
                <ListItem>
                    <ListItemIcon>
                        <PublicIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('worldwide')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <GroupIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('participation')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <AllInclusiveIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('arenaSwiss')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <EmojiEventsIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('endOfYear')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <NotInterestedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('antiCheatSummary')} />
                </ListItem>
            </List>

            <Typography variant='h6' color='text.secondary'>
                <HelpCenterIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('registrationHeader')}
            </Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <SiLichess fontSize={25} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t.rich('lichessJoin', {
                            link: (chunks) => (
                                <Link
                                    data-testid='lichess-team-link'
                                    href='https://lichess.org/team/chessdojo'
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    {chunks}
                                </Link>
                            ),
                        })}
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <SiChessdotcom fontSize={25} style={{ color: '#81b64c' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t.rich('chesscomJoin', {
                            link: (chunks) => (
                                <Link
                                    data-testid='chesscom-team-link'
                                    href='https://www.chess.com/club/chessdojo'
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    {chunks}
                                </Link>
                            ),
                        })}
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <SiDiscord fontSize={25} style={{ color: '#5865f2' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={t.rich('discordJoin', {
                            link: (chunks) => (
                                <Link
                                    data-testid='discord-invite-link'
                                    href={config.discord.url}
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    {chunks}
                                </Link>
                            ),
                        })}
                    />
                </ListItem>
            </List>

            <Divider />

            <Stack direction='row' gap={2} flexWrap='wrap'>
                <Stack spacing={2}>
                    <Typography variant='h6' color='text.secondary'>
                        <CalendarMonth sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                        {t('eventsHeader')}
                    </Typography>

                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText primary={t('mondayEvents')} />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText primary={t('wednesdayEvents')} />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                            </ListItemIcon>
                            <ListItemText primary={t('saturdayEvents')} />
                        </ListItem>
                    </List>
                </Stack>
                <img
                    src='https://chess-dojo-images.s3.us-east-1.amazonaws.com/blog/260504_DojoLiga/dojoligaschedule.png'
                    crossOrigin='anonymous'
                    style={{ borderRadius: '8px', maxWidth: 'min(500px, 100%)' }}
                />
            </Stack>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <LeaderboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('leaderboardHeader')}
            </Typography>

            <Typography>{t('weeklyEvents')}</Typography>

            <ul>
                <li>{t('weeklySwissPoints.first')}</li>
                <li>{t('weeklySwissPoints.second')}</li>
                <li>{t('weeklySwissPoints.third')}</li>
                <li>{t('weeklySwissPoints.fourth')}</li>
                <li>{t('weeklySwissPoints.fifth')}</li>
                <li>{t('weeklySwissPoints.sixthToTenth')}</li>
                <li>{t('weeklySwissPoints.allOthers')}</li>
            </ul>

            <Typography>{t('lichessTeamEvents')}</Typography>

            <ul>
                <li>{t('lichessTeamPoints.first')}</li>
                <li>{t('lichessTeamPoints.second')}</li>
                <li>{t('lichessTeamPoints.third')}</li>
                <li>{t('lichessTeamPoints.fourth')}</li>
                <li>{t('lichessTeamPoints.fifth')}</li>
                <li>{t('lichessTeamPoints.allOthers')}</li>
            </ul>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <NotInterestedIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('antiCheatHeader')}
            </Typography>

            <Typography>{t('antiCheatIntro')}</Typography>

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
            </List>
        </Stack>
    );
};

export default InfoTab;
