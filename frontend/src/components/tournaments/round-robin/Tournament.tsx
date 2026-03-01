import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { TournamentInfo } from '@/components/tournaments/round-robin/TournamentInfo';
import { getConfig } from '@/config';
import { PawnIcon } from '@/style/ChessIcons';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { PeopleAlt, TableChart, Timeline } from '@mui/icons-material';
import { TabContext, TabPanel } from '@mui/lab';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Tab as MuiTab,
    Stack,
    TabProps,
    Tabs,
} from '@mui/material';
import { useState } from 'react';
import { GiCrossedSwords } from 'react-icons/gi';
import { Crosstable } from './Crosstable';
import { Games } from './Games';
import { Pairings } from './Pairings';
import { Players } from './Players';
import { Stats } from './Stats';
import SubmitGameModal from './SubmitGameModal';
import { WithdrawModal } from './WithdrawModal';

const discordGuildId = getConfig().discord.guildId;

/** Renders a single Round Robin tournament. */
export function Tournament({
    tournament,
    onUpdateTournaments,
}: {
    tournament: RoundRobin;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}) {
    const [tab, setTab] = useState('crosstable');
    const [showSubmitGame, setShowSubmitGame] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const { user } = useAuth();

    return (
        <Card>
            <CardHeader title={<TournamentInfo tournament={tournament} />} />

            <CardContent>
                {user &&
                    tournament.players[user.username]?.status ===
                    RoundRobinPlayerStatuses.ACTIVE && (
                        <Stack sx={{ mt: -2, mb: 3 }} gap={2}>
                            <Stack direction='row' gap={1}>
                                <Button
                                    variant='contained'
                                    color='success'
                                    onClick={() => setShowSubmitGame(true)}
                                >
                                    Submit Game
                                </Button>

                                <Button
                                    variant='contained'
                                    color='error'
                                    onClick={() => setShowWithdraw(true)}
                                >
                                    Withdraw
                                </Button>
                            </Stack>

                            {tournament.discordThreadId && (
                                <Link
                                    href={`https://discord.com/channels/${discordGuildId}/${tournament.discordThreadId}`}
                                    target='_blank'
                                    rel='noopener'
                                >
                                    Schedule games with other players in Discord
                                </Link>
                            )}
                        </Stack>
                    )}

                <TabContext value={tab}>
                    <Tabs
                        variant='scrollable'
                        value={tab}
                        onChange={(_, t: string) => setTab(t)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label='Players' value='players' icon={<PeopleAlt />} />
                        <Tab label='Crosstable' value='crosstable' icon={<TableChart />} />
                        <Tab
                            label='Pairings'
                            value='pairings'
                            icon={<GiCrossedSwords size={24} />}
                        />
                        <Tab label='Games' value='games' icon={<PawnIcon />} />
                        <Tab label='Stats' value='stats' icon={<Timeline />} />
                    </Tabs>

                    <TabPanel value='players' sx={{ px: 0 }}>
                        <Players tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='crosstable' sx={{ px: 0 }}>
                        <Crosstable tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='pairings' sx={{ px: 0 }}>
                        <Pairings tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='games' sx={{ px: 0 }}>
                        <Games tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='stats' sx={{ px: 0 }}>
                        <Stats tournament={tournament} />
                    </TabPanel>
                </TabContext>
            </CardContent>

            {user && (
                <>
                    <SubmitGameModal
                        open={showSubmitGame}
                        onClose={() => setShowSubmitGame(false)}
                        user={user}
                        cohort={tournament.cohort}
                        startsAt={tournament.startsAt}
                        players={tournament.players}
                        onUpdateTournaments={onUpdateTournaments}
                    />

                    <WithdrawModal
                        open={showWithdraw}
                        onClose={() => setShowWithdraw(false)}
                        user={user}
                        cohort={tournament.cohort}
                        startsAt={tournament.startsAt}
                        onUpdateTournaments={onUpdateTournaments}
                    />
                </>
            )}
        </Card>
    );
}

function Tab(props: TabProps) {
    return <MuiTab {...props} iconPosition='start' sx={{ minHeight: '48px' }} />;
}
