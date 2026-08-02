import { Checkbox, FormControlLabel, FormGroup, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface FilterToggleOption {
    value: string;
    label: string;
    icon?: ReactNode;
    /** Theme palette key (e.g. `meet`, `book`) used for checked and unchecked states. */
    color?: string;
}

interface FilterToggleGroupProps {
    title: string;
    titleIcon?: ReactNode;
    options: FilterToggleOption[];
    selected: string[];
    /** Sentinel value meaning "all options selected". */
    allValue: string;
    onChange: (next: string[]) => void;
    'data-testid'?: string;
}

export function isFilterOptionChecked(
    selected: string[],
    allValue: string,
    value: string,
): boolean {
    return selected.includes(allValue) || selected.includes(value);
}

/** Toggles one option while preserving the all-sentinel convention used by calendar filters. */
export function toggleFilterOption(
    selected: string[],
    allValue: string,
    optionValues: string[],
    toggled: string,
    checked: boolean,
): string[] {
    const current = selected.includes(allValue)
        ? [...optionValues]
        : selected.filter((v) => v !== allValue);

    const next = checked
        ? [...new Set([...current, toggled])]
        : current.filter((v) => v !== toggled);

    if (next.length === 0) {
        return [];
    }
    if (next.length === optionValues.length) {
        return [allValue];
    }
    return next;
}

export function FilterToggleGroup({
    title,
    titleIcon,
    options,
    selected,
    allValue,
    onChange,
    'data-testid': dataTestId,
}: FilterToggleGroupProps) {
    const optionValues = options.map((o) => o.value);

    return (
        <Stack spacing={0.5} data-testid={dataTestId}>
            <Typography
                variant='subtitle2'
                color='text.secondary'
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
                {titleIcon}
                {title}
            </Typography>
            <FormGroup>
                {options.map((option) => (
                    <FormControlLabel
                        key={option.value}
                        sx={{
                            ml: 0,
                            mr: 0,
                            alignItems: 'center',
                            '& .MuiFormControlLabel-label': { width: 1 },
                        }}
                        control={
                            <Checkbox
                                size='small'
                                checked={isFilterOptionChecked(selected, allValue, option.value)}
                                onChange={(e) =>
                                    onChange(
                                        toggleFilterOption(
                                            selected,
                                            allValue,
                                            optionValues,
                                            option.value,
                                            e.target.checked,
                                        ),
                                    )
                                }
                                sx={
                                    option.color
                                        ? {
                                              color: `${option.color}.main`,
                                              '&.Mui-checked': {
                                                  color: `${option.color}.main`,
                                              },
                                          }
                                        : undefined
                                }
                            />
                        }
                        label={
                            <Stack
                                direction='row'
                                spacing={1}
                                alignItems='center'
                                sx={{ py: 0.25 }}
                            >
                                {option.icon}
                                <Typography variant='body2'>{option.label}</Typography>
                            </Stack>
                        }
                    />
                ))}
            </FormGroup>
        </Stack>
    );
}
