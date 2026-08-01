import { Slider as MuiSlider, Stack, Typography } from '@mui/material';

interface Props {
    value: number;
    setValue: (value: number) => void;
    min: number;
    max: number;
    label: string;
    valueLabel?: (value: number) => string;
}

/**
 * Renders a MUI Slider with a label and marks at specified steps.
 * @param min The min value of the slider.
 * @param max The max value of the slider.
 * @param label The label displayed to the left of the slider.
 * @param value The current value of the slider.
 * @param setValue A callback invoked with the new value of the slider on changes.
 * @param valueLabel Overrides the value label displayed to the right of the slider.
 */
export default function Slider({ min, max, label, value, setValue, valueLabel }: Props) {
    return (
        <Stack
            direction='row'
            sx={{
                alignItems: 'center',
                width: 1,
            }}
        >
            <Typography sx={{ mr: 2 }}>{label}</Typography>

            <MuiSlider
                min={min}
                max={max}
                step={1}
                valueLabelDisplay='auto'
                valueLabelFormat={valueLabel}
                value={value}
                onChange={(_, value) => setValue(value)}
                aria-labelledby={`input-${label}`}
                sx={{ flexGrow: 1, mr: 2.5 }}
            />

            <Typography sx={{ textWrap: 'nowrap' }}>
                {valueLabel ? valueLabel(value) : `${value} / ${max}`}
            </Typography>
        </Stack>
    );
}
