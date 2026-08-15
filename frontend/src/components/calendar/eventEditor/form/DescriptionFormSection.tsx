import { Notes } from '@mui/icons-material';
import { InputAdornment, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('calendar');
    return (
        <TextField
            data-testid='description-textfield'
            placeholder={required ? t('description') : t('descriptionOptional')}
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
