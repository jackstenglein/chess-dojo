import { useAuth } from '@/auth/Auth';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import useGame from '@/context/useGame';
import { CardContent, Stack } from '@mui/material';
import AdminSettings from './AdminSettings';
import EditorSettings from './EditorSettings';
import GameSettings from './GameSettings';
import SidePanelSettings from './SidePanelSettings';
import ViewerSettings from './ViewerSettings';

interface SettingsProps {
    showEditor?: boolean;
    sidePanelTabs?: DefaultUnderboardTab[];
}

const Settings: React.FC<SettingsProps> = ({ showEditor, sidePanelTabs }) => {
    const viewer = useAuth().user;
    const { game, onUpdateGame: onSaveGame } = useGame();

    return (
        <CardContent data-testid='underboard-tab-settings'>
            <Stack spacing={6}>
                {showEditor && game && <GameSettings game={game} onSaveGame={onSaveGame} />}
                {viewer?.isAdmin && game && <AdminSettings game={game} onSaveGame={onSaveGame} />}
                <EditorSettings />
                <ViewerSettings />
                {sidePanelTabs && sidePanelTabs.length > 0 && (
                    <SidePanelSettings tabs={sidePanelTabs} />
                )}
            </Stack>
        </CardContent>
    );
};

export default Settings;
