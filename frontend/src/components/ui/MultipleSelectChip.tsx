import { FormHelperText, ListItemIcon, ListItemText, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { SxProps, Theme, useTheme } from '@mui/material/styles';

import type { JSX } from 'react';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

function getStyles(value: string, selected: readonly string[], theme: Theme) {
    return {
        fontWeight: !selected.includes(value)
            ? theme.typography.fontWeightRegular
            : theme.typography.fontWeightMedium,
    };
}

export interface MultipleSelectChipOption {
    value: string;
    label: string;
    icon?: JSX.Element;
}

export interface MultipleSelectChipProps {
    selected: string[];
    setSelected: (v: string[]) => void;
    options: MultipleSelectChipOption[];
    label?: string;
    size?: 'small' | 'medium';
    sx?: SxProps;
    error?: boolean;
    helperText?: string;
    'data-cy'?: string;
    displayEmpty?: string;
    disabled?: boolean;
}

export default function MultipleSelectChip({
    selected,
    setSelected,
    options,
    label,
    size,
    sx,
    error,
    helperText,
    displayEmpty,
    disabled,
    ...others
}: MultipleSelectChipProps) {
    const theme = useTheme();

    const handleChange = (event: SelectChangeEvent<typeof selected>) => {
        const {
            target: { value },
        } = event;
        setSelected(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    return (
        <FormControl {...others} sx={sx} error={error}>
            {label && <InputLabel>{label}</InputLabel>}
            <Select
                multiple
                value={selected}
                onChange={handleChange}
                input={<OutlinedInput label={label} />}
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                            <Chip
                                key={value}
                                label={options.find((o) => o.value === value)?.label}
                                size={size}
                            />
                        ))}
                        {selected.length === 0 && !!displayEmpty && (
                            <Typography color='text.secondary' fontStyle='italic'>
                                {displayEmpty}
                            </Typography>
                        )}
                    </Box>
                )}
                MenuProps={MenuProps}
                displayEmpty={!!displayEmpty}
                disabled={disabled}
            >
                {options.map((option) => (
                    <MenuItem
                        key={option.value}
                        value={option.value}
                        style={getStyles(option.value, selected, theme)}
                    >
                        {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
                        <ListItemText>{option.label}</ListItemText>
                    </MenuItem>
                ))}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
}
