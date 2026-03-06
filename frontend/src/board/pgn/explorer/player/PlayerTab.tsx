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
import { useState } from 'react';
import Database from '../Database';
import { ExplorerDatabaseType } from '../Explorer';
import { Filters } from './Filters';
import { usePlayerOpeningTree } from './PlayerOpeningTree';
import { PlayerSources } from './PlayerSources';
import { usePlayerGames } from './usePlayerGames';

function onClickGame(game: GameInfo) {
    window.open(game.headers.Site, '_blank');
}

export function PlayerTab({ fen }: { fen: string }) {
    const {
        sources,
        setSources,
        isLoading,
        onLoad: parentOnLoad,
        onCancel,
        onClear,
        indexedCount,
        openingTree,
        filters,
        readonlyFilters,
    } = usePlayerOpeningTree();
    const isFreeTier = useFreeTier();
    const pagination = usePlayerGames(fen, openingTree, readonlyFilters);
    const [filtersOpen, setFiltersOpen] = useState(false);

    if (isFreeTier) {
        return (
            <Box mt={2}>
                <UpsellAlert>Upgrade to a full account to search by player.</UpsellAlert>
            </Box>
        );
    }

    const onLoad = () => {
        setFiltersOpen(false);
        void parentOnLoad();
    };

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
                    <Typography>Filters</Typography>
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
                <Stack direction='row' spacing={1} my={1} alignItems='center'>
                    <Typography>
                        {indexedCount} game{indexedCount === 1 ? '' : 's'} loaded...
                    </Typography>
                    <CircularProgress size={20} />
                    <Button size='small' variant='outlined' onClick={onCancel}>
                        Cancel
                    </Button>
                </Stack>
            )}

            {openingTree.current && (
                <Database
                    type={ExplorerDatabaseType.Player}
                    fen={fen}
                    position={openingTree.current?.getPosition(fen, readonlyFilters)}
                    isLoading={false}
                    pagination={pagination}
                    onClickGame={onClickGame}
                />
            )}

            {!isLoading && !openingTree.current && (
                <Button variant='contained' onClick={onLoad} sx={{ mt: 3 }} color='dojoOrange'>
                    Load Games
                </Button>
            )}
        </Stack>
    );
}
