import { useChessDB } from '@/stockfish/hooks/useChessDb';
import { Event, EventType } from '@jackstenglein/chess';
import { PersonSearch } from '@mui/icons-material';
import CloudIcon from '@mui/icons-material/Cloud';
import { TabContext } from '@mui/lab';
import { Box, CardContent, Tab, Tabs } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { SiLichess } from 'react-icons/si';
import { useLocalStorage } from 'usehooks-ts';
import { usePosition } from '../../../api/cache/positions';
import { ExplorerPositionFollower } from '../../../database/explorer';
import { ChessDojoIcon } from '../../../style/ChessDojoIcon';
import { KingIcon, RookIcon } from '../../../style/ChessIcons';
import { useChess } from '../PgnBoard';
import { ChessDBTab } from './ChessDb';
import Database from './Database';
import Header from './Header';
import { PlayerTab } from './player/PlayerTab';
import { Tablebase } from './Tablebase';
import { usePositionGames } from './usePositionGames';

const startingPositionFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const defaultTimeControls = ['standard', 'rapid', 'blitz', 'unknown'];

const explorerTabKey = 'explorerTab';

export enum ExplorerDatabaseType {
    Dojo = 'dojo',
    Masters = 'masters',
    Lichess = 'lichess',
    Player = 'player',
    Tablebase = 'tablebase',
    ChessDB = 'chessdb',
}

const Explorer = () => {
    const [tab, setTab] = useLocalStorage(explorerTabKey, ExplorerDatabaseType.Dojo);
    const { chess } = useChess();
    const [fen, setFen] = useState(chess?.fen() ?? startingPositionFen);
    const { position, request, putPosition } = usePosition(fen);
    const [minCohort, setMinCohort] = useState('');
    const [maxCohort, setMaxCohort] = useState('');
    const [timeControls, setTimeControls] = useState(defaultTimeControls);
    const pagination = usePositionGames({
        fen,
        type: tab,
        minCohort,
        maxCohort,
        timeControls,
    });

    const {
        data: chessDbMoves,
        loading: chessDbLoading,
        error: chessDbError,
        requestAnalysis: chessDbRequestAnalysis,
    } = useChessDB();

    useEffect(() => {
        if (chess) {
            const observer = {
                types: [EventType.Initialized, EventType.LegalMove],
                handler: (event: Event) => {
                    if (event.type === EventType.Initialized) {
                        setFen(chess.fen());
                    } else {
                        setFen(event.move?.after ?? chess.setUpFen());
                    }
                },
            };

            setFen(chess.fen());
            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setFen]);

    const setFollower = useCallback(
        (f: ExplorerPositionFollower | null) => {
            if (position) {
                putPosition({ ...position, follower: f });
            } else if (f) {
                putPosition({
                    follower: f,
                    normalizedFen: f.normalizedFen,
                    dojo: null,
                    masters: null,
                    lichess: null,
                    tablebase: null,
                });
            }
        },
        [putPosition, position],
    );

    const onSetTimeControls = (v: string[]) => {
        setTimeControls(
            v.sort(
                (lhs, rhs) => defaultTimeControls.indexOf(lhs) - defaultTimeControls.indexOf(rhs),
            ),
        );
    };

    const { dojo, masters, lichess, tablebase, follower } = position ?? {};

    const selectedPosition =
        tab === ExplorerDatabaseType.Dojo
            ? dojo
            : tab === ExplorerDatabaseType.Masters
              ? masters
              : lichess;

    const renderTabContent = () => {
        switch (tab) {
            case ExplorerDatabaseType.Tablebase:
                return <Tablebase fen={fen} position={tablebase} request={request} />;
            case ExplorerDatabaseType.Player:
                return <PlayerTab fen={fen} />;
            case ExplorerDatabaseType.ChessDB:
                return (
                    <ChessDBTab
                        moves={chessDbMoves}
                        loading={chessDbLoading}
                        error={chessDbError}
                        requestAnalysis={chessDbRequestAnalysis}
                    />
                );
            default:
                return (
                    <Database
                        type={tab}
                        fen={fen}
                        position={selectedPosition}
                        isLoading={request.isLoading() || !request.isSent()}
                        minCohort={minCohort}
                        maxCohort={maxCohort}
                        setMinCohort={setMinCohort}
                        setMaxCohort={setMaxCohort}
                        timeControls={timeControls}
                        setTimeControls={onSetTimeControls}
                        pagination={pagination}
                    />
                );
        }
    };

    return (
        <CardContent>
            <Header
                fen={fen}
                follower={follower}
                minCohort={minCohort}
                maxCohort={maxCohort}
                setFollower={setFollower}
            />

            <TabContext value={tab}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={tab}
                        onChange={(_, val: ExplorerDatabaseType) => setTab(val)}
                        aria-label='Position database type'
                        variant='scrollable'
                    >
                        <Tab
                            label='Dojo'
                            value={ExplorerDatabaseType.Dojo}
                            icon={<ChessDojoIcon />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-dojo'
                        />
                        <Tab
                            label='Masters'
                            value={ExplorerDatabaseType.Masters}
                            icon={<KingIcon sx={{ fontSize: '1rem' }} />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-masters'
                        />
                        <Tab
                            label='CloudDB'
                            value={ExplorerDatabaseType.ChessDB}
                            icon={<CloudIcon sx={{ fontSize: '1rem' }} />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-chessdb'
                        />
                        <Tab
                            label='Lichess'
                            value={ExplorerDatabaseType.Lichess}
                            icon={<SiLichess />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-lichess'
                        />
                        <Tab
                            label='Player'
                            value={ExplorerDatabaseType.Player}
                            icon={<PersonSearch />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-player'
                        />
                        <Tab
                            label='Tablebase'
                            value={ExplorerDatabaseType.Tablebase}
                            icon={<RookIcon sx={{ fontSize: '1rem' }} />}
                            iconPosition='start'
                            sx={{ minHeight: '48px' }}
                            data-cy='explorer-tab-button-tablebase'
                        />
                    </Tabs>
                </Box>

                {renderTabContent()}
            </TabContext>
        </CardContent>
    );
};

export default Explorer;
