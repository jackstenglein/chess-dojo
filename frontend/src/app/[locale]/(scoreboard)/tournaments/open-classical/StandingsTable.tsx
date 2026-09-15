import {
    OpenClassical,
    OpenClassicalPlayer,
    OpenClassicalPlayerStatus,
} from '@/database/tournament';
import { Stack, Tooltip, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { PlayerCell } from './PairingsTable';

type StandingsT = ReturnType<typeof useTranslations<'tournaments.openClassical.standings'>>;

enum Result {
    Win = 'W',
    ForfeitWin = 'Wf',
    Loss = 'L',
    ForfeitLoss = 'Lf',
    Draw = 'D',
    DidNotPlay = 'X',
    DidNotSubmit = 'F',
    Bye = 'Bye',
    Unknown = '',
}

const NUM_ROUNDS = 7;

function getByeElement(t: StandingsT) {
    return (
        <Stack
            sx={{
                height: 1,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Tooltip title={t('byeTooltip')}>
                <Typography>{t('byeText')}</Typography>
            </Tooltip>
        </Stack>
    );
}

function getRoundColumns(rounds: number, t: StandingsT): GridColDef<StandingsTableRow>[] {
    const result: GridColDef<StandingsTableRow>[] = [];

    for (let i = 0; i < rounds; i++) {
        result.push({
            field: `rounds${i}`,
            headerName: t('roundHeader', { num: i + 1 }),
            align: 'center',
            headerAlign: 'center',
            valueGetter: (_value, row, _column, api) => {
                const round = row.rounds[i];
                if (!round || round.result === Result.Bye) {
                    return Result.Bye;
                }

                const result = round.result;
                const opponent = api.current.getAllRowIds().indexOf(round.opponent) + 1;
                return `${result}${opponent}`;
            },
            renderCell: (params) => {
                const round = params.row.rounds[i];
                if (!round) {
                    if (params.row.lastActiveRound === 0 || params.row.lastActiveRound >= i + 1) {
                        return getByeElement(t);
                    }
                    return (
                        <Stack
                            sx={{
                                height: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Tooltip title={t('playerWithdrawnTooltip')}>
                                <Typography>-</Typography>
                            </Tooltip>
                        </Stack>
                    );
                }
                if (round.result === Result.Bye) {
                    return getByeElement(t);
                }
                if (round.result === Result.Unknown) {
                    return '';
                }

                const result = round.result;
                const opponent = params.api.getAllRowIds().indexOf(round.opponent) + 1;

                return (
                    <Stack
                        sx={{
                            height: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Tooltip title={getResultDescription(result, opponent, t)}>
                            <Typography>
                                {result}
                                {opponent}
                            </Typography>
                        </Tooltip>
                    </Stack>
                );
            },
        });
    }

    return result;
}

function getResultDescription(result: Result, opponent: number, t: StandingsT): string {
    switch (result) {
        case Result.Win:
            return t('winAgainst', { opponent });

        case Result.ForfeitWin:
            return t('winByForfeit', { opponent });

        case Result.Loss:
            return t('lossAgainst', { opponent });

        case Result.ForfeitLoss:
            return t('lossByForfeit', { opponent });

        case Result.Draw:
            return t('drawAgainst', { opponent });

        case Result.Bye:
            return t('byeDescription');

        case Result.DidNotPlay:
            return t('notPlayed', { opponent });

        case Result.DidNotSubmit:
            return t('notSubmitted', { opponent });

        case Result.Unknown:
            return '';
    }
}

function getStandingsTableColumns(t: StandingsT): GridColDef<StandingsTableRow>[] {
    return [
        {
            field: 'rank',
            headerName: t('rankColumn'),
            renderHeader: () => '',
            valueGetter: (_value, row, _col, api) =>
                api.current.getAllRowIds().indexOf(row.lichessUsername) + 1,
            sortable: false,
            filterable: false,
            align: 'center',
            width: 50,
            renderCell(params) {
                return (
                    <Stack
                        sx={{
                            height: 1,
                            justifyContent: 'center',
                        }}
                    >
                        <Typography>{params.value}</Typography>
                    </Stack>
                );
            },
        },
        {
            field: 'player',
            headerName: t('playerColumn'),
            headerAlign: 'center',
            flex: 1,
            valueGetter: (_value, row) =>
                `${row.displayName} ${row.lichessUsername} ${row.discordUsername}`,
            renderCell(params) {
                return <PlayerCell player={params.row} />;
            },
        },
        {
            field: 'total',
            headerName: t('totalColumn'),
            align: 'center',
            headerAlign: 'center',
            renderCell(params) {
                return (
                    <Stack
                        sx={{
                            height: 1,
                            justifyContent: 'center',
                        }}
                    >
                        <Typography>{params.value}</Typography>
                    </Stack>
                );
            },
        },
        ...getRoundColumns(NUM_ROUNDS, t),
    ];
}

interface StandingsTableRow extends OpenClassicalPlayer {
    total: number;
    rounds: Record<
        number,
        {
            opponent: string;
            result: Result;
        }
    >;
    status: OpenClassicalPlayerStatus;
    lastActiveRound: number;
}

function getResult(result: string, color: 'w' | 'b'): Result {
    if (result === 'Bye') {
        return Result.Bye;
    }
    if (result === '' || result === '*') {
        return Result.Unknown;
    }
    if (result === '1-0') {
        return color === 'w' ? Result.Win : Result.Loss;
    }
    if (result === '0-1') {
        return color === 'w' ? Result.Loss : Result.Win;
    }
    if (result === '1/2-1/2') {
        return Result.Draw;
    }
    if (result === '1-0F') {
        return color === 'w' ? Result.ForfeitWin : Result.ForfeitLoss;
    }
    if (result === '0-1F') {
        return color === 'w' ? Result.ForfeitLoss : Result.ForfeitWin;
    }
    if (result === '1/2-1/2F') {
        return Result.DidNotPlay;
    }
    if (result === '0-0') {
        return Result.DidNotSubmit;
    }
    return Result.Unknown;
}

function getScore(result: Result): number {
    switch (result) {
        case Result.Win:
        case Result.ForfeitWin:
            return 1;

        case Result.Draw:
        case Result.Bye:
        case Result.DidNotPlay:
            return 0.5;

        case Result.Unknown:
        case Result.Loss:
        case Result.ForfeitLoss:
        case Result.DidNotSubmit:
            return 0;
    }
}

interface StandingsTableProps {
    openClassical?: OpenClassical;
    region: string;
    ratingRange: string;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ openClassical, region, ratingRange }) => {
    const t = useTranslations('tournaments.openClassical.standings');
    const columns = useMemo(() => getStandingsTableColumns(t), [t]);
    const rows: StandingsTableRow[] = useMemo(() => {
        if (!openClassical) {
            return [];
        }

        const section = openClassical.sections[`${region}_${ratingRange}`];
        if (!section) {
            return [];
        }

        const players: Record<string, StandingsTableRow> = {};
        Object.values(section.players).forEach((player) => {
            players[player.lichessUsername] = {
                ...player,
                total: 0,
                rounds: {},
                status: player.status,
                lastActiveRound: player.lastActiveRound,
            };
        });

        section.rounds.forEach((round, idx) => {
            round.pairings.forEach((pairing) => {
                const white = players[pairing.white.lichessUsername];
                if (white) {
                    white.rounds[idx] = {
                        opponent: pairing.result ? pairing.black.lichessUsername : '',
                        result: getResult(pairing.result, 'w'),
                    };
                }

                const black = players[pairing.black.lichessUsername];
                if (black) {
                    black.rounds[idx] = {
                        opponent: pairing.result ? pairing.white.lichessUsername : '',
                        result: getResult(pairing.result, 'b'),
                    };
                }
            });
        });

        const rows = Object.values(players).filter((v) => v.lichessUsername !== 'No Opponent');

        rows.forEach((player) => {
            for (let i = 0; i < section.rounds.length; i++) {
                const round = player.rounds[i];
                if (!round) {
                    if (player.lastActiveRound === 0 || player.lastActiveRound >= i + 1) {
                        // Player received a bye
                        player.total += 0.5;
                    }
                } else {
                    player.total += getScore(round.result);
                }
            }

            for (let i = section.rounds.length; i < NUM_ROUNDS; i++) {
                player.rounds[i] = { opponent: '', result: Result.Unknown };
            }
        });

        return rows.sort((lhs, rhs) => rhs.total - lhs.total);
    }, [openClassical, region, ratingRange]);

    if (!openClassical) {
        return null;
    }

    return (
        <Stack>
            <DataGridPro
                getRowId={(player) => player.lichessUsername}
                rows={rows}
                columns={columns}
                getRowHeight={() => 'auto'}
            />
        </Stack>
    );
};

export default StandingsTable;
