import { useClubs } from '@/api/cache/clubs';
import { useAuth } from '@/auth/Auth';
import { dojoCohorts } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Groups } from '@mui/icons-material';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LanguageIcon from '@mui/icons-material/Language';
import SearchIcon from '@mui/icons-material/Search';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { MenuItem, TextField } from '@mui/material';

const NO_CLUBS: string[] = [];

interface ScoreboardViewSelectorProps {
    /** The current value of the view. */
    value: string;

    /**
     * An optional function to call when the view is changed. If not provided,
     * the default is to navigate to the new view.
     */
    onChange?: (value: string) => void;
}

/**
 * A component that allows switching between different scoreboard views.
 * @param value The current value of the view.
 * @param onChange An optional function to call when the view is changed. If not provided, the default is to navigate to the new view.
 * @returns A component that allows switching between different scoreboard views.
 */
const ScoreboardViewSelector: React.FC<ScoreboardViewSelectorProps> = ({ value, onChange }) => {
    const { user } = useAuth();
    const { clubs } = useClubs(user?.clubs || NO_CLUBS);
    const router = useRouter();

    const defaultOnChange = (value: string) => {
        router.push(`/scoreboard/${value}`);
    };

    return (
        <TextField
            data-testid='scoreboard-view-selector'
            id='scoreboard-cohort-select'
            select
            label='View'
            value={value}
            onChange={(event) =>
                onChange ? onChange(event.target.value) : defaultOnChange(event.target.value)
            }
            sx={{ mb: 3 }}
            fullWidth
        >
            <MenuItem value='search'>
                <SearchIcon sx={{ marginRight: '0.6em', verticalAlign: 'middle' }} /> Search Users
            </MenuItem>
            <MenuItem value='stats'>
                <AutoGraphIcon sx={{ marginRight: '0.6em', verticalAlign: 'middle' }} /> Statistics
            </MenuItem>
            <MenuItem value='dojo'>
                <LanguageIcon sx={{ marginRight: '0.6em', verticalAlign: 'middle' }} /> Full Dojo
            </MenuItem>
            <MenuItem value='following'>
                <ThumbUpIcon sx={{ marginRight: '0.6em', verticalAlign: 'middle' }} /> Followers
            </MenuItem>
            {clubs.map((club) => (
                <MenuItem key={club.id} value={`clubs/${club.id}`}>
                    <Groups sx={{ marginRight: '0.6em', verticalAlign: 'middle' }} /> {club.name}
                </MenuItem>
            ))}
            {dojoCohorts.map((option) => (
                <MenuItem key={option} value={option}>
                    <CohortIcon
                        cohort={option}
                        sx={{ marginRight: '0.6em', verticalAlign: 'middle' }}
                        tooltip=''
                        size={25}
                    />{' '}
                    {option}
                </MenuItem>
            ))}
        </TextField>
    );
};

export default ScoreboardViewSelector;
