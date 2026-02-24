import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Button, Grid, InputBase, Slider, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';

interface InputSliderProps {
    value: number;
    setValue: React.Dispatch<React.SetStateAction<number>>;
    max: number;
    min: number;
    suffix?: string;
}

const InputSlider: React.FC<InputSliderProps> = ({ value, setValue, max, min, suffix }) => {
    useEffect(() => {
        if (value < min) {
            setValue(min);
        }
    }, []);

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
        setValue(newValue as number);
    };

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
        <Grid
            container
            width={1}
            columnGap={4}
            rowGap={2}
            alignItems='center'
            justifyContent='space-between'
            pt={1}
        >
            <Grid
                size={{
                    xs: 12,
                    sm: 'grow',
                }}
                display='flex'
                alignItems='end'
            >
                <Slider
                    value={typeof value === 'number' ? value : 0}
                    onChange={handleSliderChange}
                    aria-labelledby='input-slider'
                    step={1}
                    max={max}
                    min={min}
                    sx={{ mb: suffix ? -2.5 : 0 }}
                />
            </Grid>
            <Grid
                size={{
                    xs: 12,
                    sm: 'auto',
                }}
            >
                <Stack alignItems='start' spacing={0.5}>
                    {suffix && (
                        <Typography
                            variant='subtitle2'
                            color='text.secondary'
                            textAlign='center'
                            width={1}
                        >
                            {suffix}
                        </Typography>
                    )}
                    <Stack direction='row' aria-label={suffix ?? 'Progress count'}>
                        <Button
                            data-cy='task-updater-decrement'
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
                                style: {
                                    textAlign: 'center',
                                    MozAppearance: 'textfield',
                                },
                            }}
                            sx={{
                                width: 64,
                                border: 1,
                                borderColor: 'divider',
                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button':
                                    {
                                        WebkitAppearance: 'none',
                                        margin: 0,
                                    },
                            }}
                        />

                        <Button
                            data-cy='task-updater-increment'
                            onClick={handleIncrement}
                            variant='outlined'
                            aria-label='Increment'
                            sx={{ px: 1.5, minWidth: 40, borderRadius: '0 4px 4px 0' }}
                        >
                            <AddIcon fontSize='small' />
                        </Button>
                    </Stack>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default InputSlider;
