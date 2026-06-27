import { useAuth } from '@/auth/Auth';
import { ScoreboardToolbar } from '@/components/scoreboard/ScoreboardToolbar';
import { ScoreboardSummary } from '@/database/scoreboard';
import Scoreboard from '@/scoreboard/Scoreboard';

interface ScoreboardTabProps {
    data?: ScoreboardSummary[];
}

export const ScoreboardTab: React.FC<ScoreboardTabProps> = ({ data }) => {
    const { user } = useAuth();
    return (
        <Scoreboard
            user={user}
            rows={data || []}
            loading={false}
            slots={{ toolbar: ScoreboardToolbar }}
        />
    );
};
