import PgnBoard from '@/board/pgn/PgnBoard';
import PgnErrorBoundary from '@/games/view/PgnErrorBoundary';
import { Search } from '@mui/icons-material';
import { Box, CardContent } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DefaultUnderboardTab } from 'src/board/pgn/boardTools/underboard/underboardTabs';
import { ModuleProps } from './Module';
import PgnSelector from './PgnSelector';

const ModelGamesModule: React.FC<ModuleProps> = ({ module }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const t = useTranslations('learn.modelGames');

    if (!module.pgns || module.pgns.length < 1) {
        return null;
    }

    return (
        <Box sx={{ py: 4, px: 0 }}>
            <PgnErrorBoundary pgn={module.pgns[selectedIndex]}>
                <PgnBoard
                    key={module.pgns[selectedIndex]}
                    pgn={module.pgns[selectedIndex]}
                    showPlayerHeaders={true}
                    startOrientation={module.boardOrientation}
                    initialUnderboardTab='selector'
                    underboardTabs={[
                        {
                            name: 'selector',
                            tooltip: t('selectGame'),
                            icon: <Search />,
                            element: (
                                <CardContent data-testid='pgn-selector'>
                                    <PgnSelector
                                        pgns={module.pgns}
                                        selectedIndex={selectedIndex}
                                        setSelectedIndex={setSelectedIndex}
                                        noCard
                                    />
                                </CardContent>
                            ),
                        },
                        DefaultUnderboardTab.Share,
                        DefaultUnderboardTab.Settings,
                    ]}
                />
            </PgnErrorBoundary>
        </Box>
    );
};

export default ModelGamesModule;
