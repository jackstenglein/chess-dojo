import PgnBoard from '@/board/pgn/PgnBoard';
import { Box, Container } from '@mui/material';
import { ModuleProps } from './Module';

const PgnViewerModule: React.FC<ModuleProps> = ({ module }) => {
    if (!module.pgns || module.pgns.length < 1) {
        return null;
    }

    return (
        <Container
            maxWidth={false}
            sx={{
                pt: 4,
                pb: 4,
                px: '0 !important',
                '--gap': '16px',
                '--site-header-margin': '60px',
                '--player-header-height': '0px',
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
                    rowGap: '16px',
                    gridTemplateRows: {
                        xs: 'auto auto',
                    },
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'var(--board-size) var(--gap) var(--coach-width) auto',
                    },
                    gridTemplateAreas: {
                        xs: '"pgn" "extras"',
                        md: '"pgn pgn pgn pgn" "extras . . ."',
                    },
                }}
            >
                <PgnBoard
                    key={module.pgns[0]}
                    pgn={module.pgns[0]}
                    showPlayerHeaders={false}
                    startOrientation={module.boardOrientation}
                    underboardTabs={[]}
                    disableNullMoves={false}
                />
            </Box>
        </Container>
    );
};

export default PgnViewerModule;
