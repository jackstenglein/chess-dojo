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
import { SiChessdotcom, SiDiscord, SiLichess } from 'react-icons/si';

const InfoTab = () => {
    const config = getConfig();
    return (
        <Stack spacing={2}>
            <Typography variant='h5' textAlign='center' color='text.secondary'>
                Welcome to the DojoLiga!
                <WavingHandIcon sx={{ verticalAlign: 'middle', ml: 1 }} color='dojoOrange' />
            </Typography>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <MilitaryTechIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                DojoLiga Info
            </Typography>
            <List>
                <ListItem>
                    <ListItemIcon>
                        <PublicIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary="The DojoLiga is ChessDojo's blitz, rapid, and classical league. It is open
            to all players worldwide."
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <GroupIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Participate in any league tournaments on either Lichess or Chess.com. All players will be automatically tracked on the leaderboard.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <AllInclusiveIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='The league consists of both arena and swiss tournaments with various time controls: blitz, rapid, and classical.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <EmojiEventsIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='At the end of each year, the top players on the leaderboard will be invited to the annual Dojo Championship. More info to be announced in September.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <NotInterestedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Strict anti-cheat measures in place to allow players to learn and grow in the game they love.' />
                </ListItem>
            </List>

            <Typography variant='h6' color='text.secondary'>
                <HelpCenterIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                Registration Info
            </Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <SiLichess fontSize={25} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <>
                                Join{' '}
                                <Link
                                    data-testid='lichess-team-link'
                                    href='https://lichess.org/team/chessdojo'
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    ChessDojo's Team
                                </Link>{' '}
                                on Lichess.
                            </>
                        }
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <SiChessdotcom fontSize={25} style={{ color: '#81b64c' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <>
                                Join{' '}
                                <Link
                                    data-testid='chesscom-team-link'
                                    href='https://www.chess.com/club/chessdojo'
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    ChessDojo's Team
                                </Link>{' '}
                                on Chess.com.
                            </>
                        }
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <SiDiscord fontSize={25} style={{ color: '#5865f2' }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <>
                                Join{' '}
                                <Link
                                    data-testid='discord-invite-link'
                                    href={config.discord.url}
                                    target='_blank'
                                    rel='noreferrer'
                                    color='primary'
                                >
                                    ChessDojo's Discord
                                </Link>{' '}
                                to optionally connect your Lichess and Chess.com accounts!
                            </>
                        }
                    />
                </ListItem>
            </List>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <LeaderboardIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                Leaderboard Info
            </Typography>

            <Typography>
                The points scored from each arena and swiss tournament are tracked to formulate the
                leaderboard for various categories. The Grand Prix leaderboard tracks the total
                number of Top 10 finishes in all events of a particular time control, with points
                awarded as follows:
            </Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Blitz/Rapid/Classical Arena - Total points scored per individual in all league arenas.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Blitz/Rapid/Classical Swiss - Total points scored per individual in all league swisses.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Blitz/Rapid/Classical Grand Prix - Total points earned via top-10 finishes, with 10 points for 1st place, 9 for 2nd, ..., 1 point for 10th.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Middlegame Sparring - Total points scored in middlegame sparring tournaments.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Endgame Sparring - Total points scored in endgame sparring tournaments.' />
                </ListItem>
            </List>

            <Typography variant='h6' color='text.secondary'>
                <NotInterestedIcon sx={{ verticalAlign: 'middle', mr: 1 }} color='dojoOrange' />
                Anti-cheat Info
            </Typography>

            <Typography>
                DojoLiga takes cheating very seriously and has the following anti-cheat policies:
            </Typography>

            <List>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary="If a player's account gets closed for cheating/fair play violations on Chess.com/Lichess, they are subject to being banned from ChessDojo's Discord server." />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='If a player is caught cheating but immediately admits wrongdoing and apologizes, based on the severity of their actions they may be given a second chance. However, they will still be prohibited from playing in DojoLiga for at least 3 months.' />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <RadioButtonCheckedIcon sx={{ color: 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText primary='Cheaters are tracked by the system automatically and are evicted from the leaderboards immediately.' />
                </ListItem>
            </List>

            <Divider />

            <Typography variant='h6' color='text.secondary'>
                <SiDiscord style={{ verticalAlign: 'middle', marginRight: 9, color: '#5865f2' }} />
                Discord Info
            </Typography>

            <Typography>
                Join the the ChessDojo Discord and connect your accounts, run additional commands in
                #player-commands channel to stay up to date with the liga!
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell>/verify</TableCell>
                            <TableCell>
                                Join the league & connect your Discord to Lichess account
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/verifychesscom</TableCell>
                            <TableCell>
                                Join the league & connect your Discord to Chess.com account
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/profile</TableCell>
                            <TableCell>View your ratings & stats</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/update</TableCell>
                            <TableCell>Update your ratings/belt role</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/score</TableCell>
                            <TableCell>View your individual scores in the league</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/rank</TableCell>
                            <TableCell>View your individual rankings in the league</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/top10</TableCell>
                            <TableCell>
                                View top 10 players for blitz, classical, rapid ratings in league
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>/help</TableCell>
                            <TableCell>See list of commands</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
};

export default InfoTab;
