import { LocationOn } from '@mui/icons-material';
import { InputAdornment, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

interface LocationFormSectionProps {
    location: string;
    setLocation: (value: string) => void;
    helperText?: string;
    required?: boolean;
    error?: string;
}

const LocationFormSection: React.FC<LocationFormSectionProps> = ({
    location,
    setLocation,
    helperText,
    required,
    error,
}) => {
    const t = useTranslations('calendar');
    return (
        <TextField
            data-testid='location-textfield'
            fullWidth
            placeholder={required ? t('location') : t('locationOptional')}
            variant='outlined'
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            helperText={error || helperText}
            error={Boolean(error)}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position='start'>
                            <LocationOn />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
};

export default LocationFormSection;
