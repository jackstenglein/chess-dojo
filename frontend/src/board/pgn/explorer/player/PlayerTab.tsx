import { useFreeTier } from '@/auth/Auth';
import { GameInfo } from '@/database/game';
import UpsellAlert from '@/upsell/UpsellAlert';
import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Database from '../Database';
import { ExplorerDatabaseType } from '../Explorer';
import { Filters } from './Filters';
import { usePlayerOpeningTree } from './PlayerOpeningTree';
import { Color } from './PlayerSource';
import { PlayerSources } from './PlayerSources';
import { createRepertoireSpyMoveProvider } from './repertoireSpyMoveProvider';
import { DEFAULT_REPERTOIRE_SPY_START_FEN, useRepertoireSpyPlay } from './RepertoireSpyPlayContext';
import { RepertoireSpyPlayControls } from './RepertoireSpyPlayControls';
import { usePlayerGames } from './usePlayerGames';

function onClickGame(game: GameInfo) {
    window.open(game.headers.Site, '_blank');
}

export function PlayerTab({ fen }: { fen: string }) {
    const t = useTranslations('analysisBoard.explorer.player');
    const {
        sources,
        setSources,
        isLoading,
        onLoad: parentOnLoad,
        onClear,
        indexedCount,
        openingTree,
        filters,
        readonlyFilters,
    } = usePlayerOpeningTree();
    const isFreeTier = useFreeTier();
    const pagination = usePlayerGames(fen, openingTree, readonlyFilters);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const { isAvailable, startRepertoireSpyGame } = useRepertoireSpyPlay();

    if (isFreeTier) {
        return (
            <Box
                sx={{
                    mt: 2,
                }}
            >
                <UpsellAlert>{t('upsellSearchByPlayer')}</UpsellAlert>
            </Box>
        );
    }

    const onLoad = () => {
        setFiltersOpen(false);
        void parentOnLoad();
    };

    const position = openingTree.current?.getPosition(fen, readonlyFilters);

    return (
        <Stack>
            <Accordion
                expanded={filtersOpen || (!isLoading && !openingTree.current)}
                onChange={(_, expanded) => setFiltersOpen(expanded)}
                disableGutters
                elevation={0}
                sx={{ mt: 1, background: 'transparent' }}
            >
                <AccordionSummary
                    sx={{
                        flexDirection: 'row-reverse',
                        gap: 1,
                        p: 0,
                        display: !isLoading && !openingTree.current ? 'none' : undefined,
                    }}
                    expandIcon={<ExpandMore />}
                >
                    <Typography>{t('filtersLabel')}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <PlayerSources
                        sources={sources}
                        setSources={setSources}
                        locked={isLoading || !!openingTree.current}
                        onClear={onClear}
                    />
                    <Filters filters={filters} />
                </AccordionDetails>
            </Accordion>

            {isLoading && (
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        my: 1,
                    }}
                >
                    <Typography>{t('gamesLoadedCount', { count: indexedCount })}</Typography>
                    <CircularProgress size={20} />
                </Stack>
            )}

            {openingTree.current && (
                <Database
                    type={ExplorerDatabaseType.Player}
                    fen={fen}
                    position={position}
                    isLoading={false}
                    pagination={pagination}
                    onClickGame={onClickGame}
                />
            )}

            {isAvailable && openingTree.current && (
                <RepertoireSpyPlayControls
                    filters={readonlyFilters}
                    performanceRating={position?.performanceData?.performanceRating}
                    onStart={({ playerColor, maiaRating, minGames, timeControl }) => {
                        if (!openingTree.current) {
                            return;
                        }
                        const databaseColor = playerColor === 'white' ? Color.Black : Color.White;
                        startRepertoireSpyGame({
                            playerColor,
                            maiaRating,
                            minGames,
                            timeControl,
                            startFen: fen || DEFAULT_REPERTOIRE_SPY_START_FEN,
                            botMoveProvider: createRepertoireSpyMoveProvider({
                                openingTree: openingTree.current,
                                filters: readonlyFilters,
                                databaseColor,
                                minGames,
                            }),
                        });
                    }}
                />
            )}

            {!isLoading && !openingTree.current && (
                <Button variant='contained' onClick={onLoad} sx={{ mt: 3 }} color='dojoOrange'>
                    {t('loadGamesButton')}
                </Button>
            )}
        </Stack>
    );
}
