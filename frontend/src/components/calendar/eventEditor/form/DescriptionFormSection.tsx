import { Notes } from '@mui/icons-material';
import { InputAdornment, TextField } from '@mui/material';

interface DescriptionFormSectionProps {
    description: string;
    setDescription: (value: string) => void;
    required?: boolean;
    error?: string;
}

const DescriptionFormSection: React.FC<DescriptionFormSectionProps> = ({
    description,
    setDescription,
    required,
    error,
}) => {
    return (
        <TextField
            data-testid='description-textfield'
            placeholder={`Description${required ? '' : ' (Optional)'}`}
            multiline
            minRows={3}
            maxRows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={Boolean(error)}
            helperText={error}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position='start' sx={{ alignSelf: 'start' }}>
                            <Notes />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
};

export default DescriptionFormSection;
