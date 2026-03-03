import { Person } from '@mui/icons-material';
import { InputAdornment, TextField } from '@mui/material';

interface MaxParticipantsFormSectionProps {
    maxParticipants: string;
    setMaxParticipants: (value: string) => void;
    helperText?: string;
    error?: string;
}

const MaxParticipantsFormSection: React.FC<MaxParticipantsFormSectionProps> = ({
    maxParticipants,
    setMaxParticipants,
    helperText,
    error,
}) => {
    return (
        <TextField
            data-testid='participants-textfield'
            fullWidth
            placeholder='Max Participants'
            variant='outlined'
            value={maxParticipants}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position='start'>
                            <Person />
                        </InputAdornment>
                    ),
                },
                htmlInput: {
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                },
            }}
            onChange={(event) => setMaxParticipants(event.target.value)}
            helperText={error || helperText}
            error={Boolean(error)}
        />
    );
};

export default MaxParticipantsFormSection;
