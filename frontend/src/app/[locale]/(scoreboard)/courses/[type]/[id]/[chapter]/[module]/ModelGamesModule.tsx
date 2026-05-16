import PgnBoard from '@/board/pgn/PgnBoard';
import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { Box, Container, Stack } from '@mui/material';
import { useState } from 'react';
import { ModuleProps } from './Module';
import PgnSelector from './PgnSelector';

const ModelGamesModule: React.FC<ModuleProps> = ({ module }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    if (!module.pgns || module.pgns.length < 1) {
        return null;
    }

    return (
        <Stack>
            <Container
                maxWidth={false}
                sx={{
                    pt: 4,
                    pb: 4,
                    px: '0 !important',
                    '--gap': '16px',
                    '--site-header-margin': '60px',
                    '--player-header-height': '28px',
                    '--toc-width': '21vw',
                    '--underboard-width': '400px',
                    '--coach-width': '400px',
                    '--tools-height': '40px',
                    '--board-width': 'calc(100vw - var(--coach-width) - 60px - var(--toc-width))',
                    '--board-height':
                        'calc(100vh - var(--navbar-height) - var(--site-header-margin) - var(--tools-height) - 8px - 2 * var(--player-header-height))',
                    '--board-size': 'calc(min(var(--board-width), var(--board-height)))',
                }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        rowGap: '32px',
                        gridTemplateRows: {
                            xs: 'auto auto',
                        },
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'auto var(--board-size) var(--gap) var(--coach-width) auto',
                        },
                        gridTemplateAreas: {
                            xs: '"extras" "pgn"',
                            md: '". extras extras extras ." "pgn pgn pgn pgn pgn"',
                        },
                    }}
                >
                    <PgnSelector
                        pgns={module.pgns}
                        selectedIndex={selectedIndex}
                        setSelectedIndex={setSelectedIndex}
                    />

                    <PgnErrorBoundary pgn={module.pgns[selectedIndex]}>
                        <PgnBoard
                            key={module.pgns[selectedIndex]}
                            pgn={module.pgns[selectedIndex]}
                            showPlayerHeaders={true}
                            startOrientation={module.boardOrientation}
                            underboardTabs={[]}
                        />
                    </PgnErrorBoundary>
                </Box>
            </Container>
        </Stack>
    );
};

export default ModelGamesModule;
