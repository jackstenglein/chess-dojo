import { getConfig } from '@/config';
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
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
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

            <Typography variant='h6' color='text.secondary'>
                <LeaderboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                {t('leaderboardHeader')}
            </Typography>

            <Typography>{t('leaderboardIntro')}</Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardArena')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardSwiss')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardGrandPrix')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardMiddlegame')} />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('leaderboardEndgame')} />
                </ListItem>
            </List>

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
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary={t('antiCheatTracked')} />
                </ListItem>
            </List>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <SiDiscord style={{ verticalAlign: 'middle', marginRight: 9, color: '#5865f2' }} />
                {t('discordHeader')}
            </Typography>

            <Typography>{t('discordIntro')}</Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>/verify</TableCell>
                            <TableCell>{t('cmdVerify')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/verifychesscom</TableCell>
                            <TableCell>{t('cmdVerifyChesscom')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/profile</TableCell>
                            <TableCell>{t('cmdProfile')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/update</TableCell>
                            <TableCell>{t('cmdUpdate')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/score</TableCell>
                            <TableCell>{t('cmdScore')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/rank</TableCell>
                            <TableCell>{t('cmdRank')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/top10</TableCell>
                            <TableCell>{t('cmdTop10')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/help</TableCell>
                            <TableCell>{t('cmdHelp')}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
};

export default InfoTab;
