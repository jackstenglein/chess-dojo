import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { TournamentInfo } from '@/components/tournaments/round-robin/TournamentInfo';
import { getConfig } from '@/config';
import { PawnIcon } from '@/style/ChessIcons';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    CalendarMonth,
    PeopleAlt,
    TableChart,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
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
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { GiCrossedSwords } from 'react-icons/gi';
import { Activity } from './Activity';
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
    const t = useTranslations('tournaments.roundRobin.tournament');

    return (
        <Card>
            <CardHeader title={<TournamentInfo tournament={tournament} />} />

            <CardContent>
                {user &&
                    tournament.players[user.username]?.status ===
                        RoundRobinPlayerStatuses.ACTIVE && (
                        <Stack
                            sx={{
                                gap: 2,
                                mt: -2,
                                mb: 3,
                            }}
                        >
                            <Stack
                                direction='row'
                                sx={{
                                    gap: 1,
                                }}
                            >
                                <Button
                                    variant='contained'
                                    color='success'
                                    onClick={() => setShowSubmitGame(true)}
                                >
                                    {t('submitGame')}
                                </Button>

                                <Button
                                    variant='contained'
                                    color='error'
                                    onClick={() => setShowWithdraw(true)}
                                >
                                    {t('withdraw')}
                                </Button>
                            </Stack>

                            {tournament.discordThreadId && (
                                <Link
                                    href={`https://discord.com/channels/${discordGuildId}/${tournament.discordThreadId}`}
                                    target='_blank'
                                    rel='noopener'
                                >
                                    {t('scheduleDiscord')}
                                </Link>
                            )}
                        </Stack>
                    )}

                <TabContext value={tab}>
                    <Tabs
                        variant='scrollable'
                        value={tab}
                        onChange={(_, newTab: string) => setTab(newTab)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label={t('tabPlayers')} value='players' icon={<PeopleAlt />} />
                        <Tab label={t('tabCrosstable')} value='crosstable' icon={<TableChart />} />
                        <Tab
                            label={t('tabPairings')}
                            value='pairings'
                            icon={<GiCrossedSwords size={24} />}
                        />
                        <Tab label={t('tabGames')} value='games' icon={<PawnIcon />} />
                        <Tab label={t('tabActivity')} value='activity' icon={<CalendarMonth />} />
                        <Tab label={t('tabStats')} value='stats' icon={<TimelineIcon />} />
                    </Tabs>

                    <TabPanel value='players' sx={{ px: 0 }}>
                        <Players
                            tournament={tournament}
                            onUpdate={(updated) =>
                                onUpdateTournaments({ tournament: updated as RoundRobin })
                            }
                        />
                    </TabPanel>

                    <TabPanel value='crosstable' sx={{ px: 0 }}>
                        <Crosstable tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='pairings' sx={{ px: 0 }}>
                        <Pairings
                            tournament={tournament}
                            onUpdate={(updated) => onUpdateTournaments({ tournament: updated })}
                        />
                    </TabPanel>

                    <TabPanel value='games' sx={{ px: 0 }}>
                        <Games tournament={tournament} />
                    </TabPanel>

                    <TabPanel value='activity' sx={{ px: 0 }}>
                        <Activity tournament={tournament} />
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
