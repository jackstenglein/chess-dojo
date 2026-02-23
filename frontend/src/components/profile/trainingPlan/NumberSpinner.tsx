import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Button, InputBase, Stack, Typography } from '@mui/material';

interface NumberSpinnerProps {
    value: number;
    setValue: React.Dispatch<React.SetStateAction<number>>;
    min: number;
    suffix?: string;
}

const NumberSpinner: React.FC<NumberSpinnerProps> = ({ value, setValue, min, suffix }) => {
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.value === '' ? 0 : parseInt(event.target.value);
        if (isNaN(value)) {
            value = 0;
        }
        setValue(value);
    };

    const handleBlur = () => {
        if (value < min) {
            setValue(min);
        }
    };

    const handleDecrement = () => {
        setValue((prev) => Math.max(min, prev - 1));
    };

    const handleIncrement = () => {
        setValue((prev) => prev + 1);
    };

    return (
        <Stack alignItems='start' spacing={0.5} sx={{ maxWidth: 200 }}>
            {suffix && (
                <Typography variant='subtitle2' color='text.secondary' textAlign='center' width={1}>
                    {suffix}
                </Typography>
            )}
            <Stack direction='row' aria-label={suffix ?? 'Progress count'} sx={{ width: 1 }}>
                <Button
                    onClick={handleDecrement}
                    disabled={value <= min}
                    variant='outlined'
                    aria-label='Decrement'
                    sx={{ px: 1.5, minWidth: 40, borderRadius: '4px 0 0 4px' }}
                >
                    <RemoveIcon fontSize='small' />
                </Button>

                <InputBase
                    data-cy='task-updater-count'
                    value={value}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    inputProps={{
                        step: 1,
                        min: min,
                        type: 'number',
                        'aria-label': suffix ?? 'Count',
                        style: { textAlign: 'center', MozAppearance: 'textfield' },
                    }}
                    sx={{
                        flex: 1,
                        border: 1,
                        borderColor: 'divider',
                        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                        },
                    }}
                />

                <Button
                    onClick={handleIncrement}
                    variant='outlined'
                    aria-label='Increment'
                    sx={{ px: 1.5, minWidth: 40, borderRadius: '0 4px 4px 0' }}
                >
                    <AddIcon fontSize='small' />
                </Button>
            </Stack>
        </Stack>
    );
};

export default NumberSpinner;
