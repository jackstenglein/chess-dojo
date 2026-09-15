import PgnBoard from '@/board/pgn/PgnBoard';
import { Box } from '@mui/material';
import { DefaultUnderboardTab } from 'src/board/pgn/boardTools/underboard/underboardTabs';
import { ModuleProps } from './Module';

const PgnViewerModule: React.FC<ModuleProps> = ({ module }) => {
    if (!module.pgns || module.pgns.length < 1) {
        return null;
    }

    return (
        <Box sx={{ py: 4 }}>
            <PgnBoard
                key={module.pgns[0]}
                pgn={module.pgns[0]}
                showPlayerHeaders={false}
                startOrientation={module.boardOrientation}
                underboardTabs={[
                    DefaultUnderboardTab.Explorer,
                    DefaultUnderboardTab.Share,
                    DefaultUnderboardTab.Settings,
                ]}
                disableNullMoves={false}
                initialUnderboardTab={DefaultUnderboardTab.Explorer}
            />
        </Box>
    );
};

export default PgnViewerModule;
