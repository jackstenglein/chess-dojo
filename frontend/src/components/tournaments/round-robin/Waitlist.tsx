import { useAuth, useFreeTier } from '@/auth/Auth';
import { dojoCohorts } from '@/database/user';
import {
    MAX_ROUND_ROBIN_PLAYERS,
    MIN_ROUND_ROBIN_PLAYERS,
    RoundRobin,
    RoundRobinWaitlist,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { AccessAlarm, PeopleAlt } from '@mui/icons-material';
import { Button, Card, CardContent, CardHeader, Chip, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Players } from './Players';
import { RegisterModal } from './RegisterModal';
import { TimeControlChip } from './TimeControlChip';
import { WithdrawModal } from './WithdrawModal';

export function Waitlist({
    tournament,
    onUpdateTournaments,
}: {
    tournament: RoundRobinWaitlist;
    onUpdateTournaments: (props: { waitlist?: RoundRobin; tournament?: RoundRobin }) => void;
}) {
    const { user } = useAuth();
    const isFreeTier = useFreeTier();
    const [showRegistration, setShowRegistration] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const t = useTranslations('tournaments.roundRobin.waitlist');

    const canRegister =
        user &&
        !tournament.players[user.username] &&
        Math.abs(dojoCohorts.indexOf(user.dojoCohort) - dojoCohorts.indexOf(tournament.cohort)) <=
            1;

    const daysTillStart = getDaysTillStart(tournament);

    return (
        <Card>
            <CardHeader
                title={
                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            gap: 2,
                            alignItems: 'center',
                        }}
                    >
                        <Typography variant='h4'>{t('title')}</Typography>

                        <Chip
                            label={t('playerCount', {
                                current: Object.values(tournament.players).length,
                                max: 10,
                            })}
                            icon={<PeopleAlt />}
                            color='secondary'
                        />

                        <TimeControlChip cohort={tournament.cohort} />

                        {daysTillStart > 0 && (
                            <Chip
                                label={t('startsIn', { days: daysTillStart })}
                                icon={<AccessAlarm />}
                                color='warning'
                            />
                        )}
                    </Stack>
                }
            />
            <CardContent>
                {canRegister && (
                    <Button
                        variant='contained'
                        color='success'
                        sx={{ mt: -2, mb: 3 }}
                        onClick={() => setShowRegistration(true)}
                    >
                        {isFreeTier ? t('registerWithFee') : t('register')}
                    </Button>
                )}

                {user && tournament.players[user.username] && (
                    <Button
                        variant='contained'
                        color='error'
                        sx={{ mt: -2, mb: 3 }}
                        onClick={() => setShowWithdraw(true)}
                    >
                        {t('withdraw')}
                    </Button>
                )}

                <Typography>
                    {daysTillStart > 0
                        ? t('startMessage', { days: daysTillStart, max: MAX_ROUND_ROBIN_PLAYERS })
                        : t('startMessageImmediate', {
                              max: MAX_ROUND_ROBIN_PLAYERS,
                              min: MIN_ROUND_ROBIN_PLAYERS,
                          })}
                </Typography>

                <Players
                    tournament={tournament}
                    onUpdate={(updated) => {
                        if (updated.startsAt === 'WAITING') {
                            onUpdateTournaments({ waitlist: updated as RoundRobin });
                        } else {
                            onUpdateTournaments({ tournament: updated as RoundRobin });
                        }
                    }}
                />
            </CardContent>

            {user && (
                <>
                    <RegisterModal
                        open={showRegistration}
                        onClose={() => setShowRegistration(false)}
                        user={user}
                        cohort={tournament.cohort}
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

function getDaysTillStart(waitlist: RoundRobinWaitlist): number {
    if (Object.values(waitlist.players).length < MIN_ROUND_ROBIN_PLAYERS) {
        return 0;
    }
    if (!waitlist.startEligibleAt) {
        return 0;
    }

    const now = new Date();
    const startEligibleAt = new Date(waitlist.startEligibleAt);

    const diffInMs = now.getTime() - startEligibleAt.getTime();
    const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

    const daysLeft = Math.max(1, 7 - diffInDays);
    return daysLeft;
}
