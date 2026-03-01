import { useAuth } from '@/auth/Auth';
import useGame from '@/context/useGame';
import { CardContent, Stack } from '@mui/material';
import AdminSettings from './AdminSettings';
import EditorSettings from './EditorSettings';
import GameSettings from './GameSettings';
import ViewerSettings from './ViewerSettings';

interface SettingsProps {
    showEditor?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ showEditor }) => {
    const viewer = useAuth().user;
    const { game, onUpdateGame: onSaveGame } = useGame();

    return (
        <CardContent data-testid='underboard-tab-settings'>
            <Stack spacing={6}>
                {showEditor && game && <GameSettings game={game} onSaveGame={onSaveGame} />}
                {viewer?.isAdmin && game && <AdminSettings game={game} onSaveGame={onSaveGame} />}
                <EditorSettings />
                <ViewerSettings />
            </Stack>
        </CardContent>
    );
};

export default Settings;
