import { CoursePurchaseOption } from '@/database/course';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { emptyPurchaseOption, emptySellingPoint, removeItem, replaceItem } from './courseEditor';

export function PurchaseOptionsEditor({
    options,
    onChange,
}: {
    options: CoursePurchaseOption[];
    onChange: (options: CoursePurchaseOption[]) => void;
}) {
    return (
        <Stack spacing={2}>
            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='h6'>Purchase options</Typography>
                <Button onClick={() => onChange([...options, emptyPurchaseOption()])}>
                    Add option
                </Button>
            </Stack>
            {options.length === 0 && (
                <Typography sx={{ color: 'text.secondary' }}>
                    No purchase options. Required to publish unless the course is included with a
                    subscription and unavailable to free-tier users.
                </Typography>
            )}
            {options.map((option, index) => (
                <Stack
                    key={index}
                    spacing={2}
                    sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                    <Stack direction='row' sx={{ alignItems: 'flex-start', gap: 1 }}>
                        <TextField
                            label='Option name'
                            value={option.name}
                            onChange={(e) =>
                                onChange(
                                    replaceItem(options, index, {
                                        ...option,
                                        name: e.target.value,
                                    }),
                                )
                            }
                            fullWidth
                            helperText='Shown on the buy card. Leave blank to use the course name.'
                        />
                        <IconButton
                            aria-label='Remove purchase option'
                            onClick={() => onChange(removeItem(options, index))}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label='Full price (USD)'
                            type='number'
                            value={centsToInput(option.fullPrice)}
                            onChange={(e) =>
                                onChange(
                                    replaceItem(options, index, {
                                        ...option,
                                        fullPrice: dollarsToCents(e.target.value),
                                    }),
                                )
                            }
                            fullWidth
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        />
                        <TextField
                            label='Sale price (USD)'
                            type='number'
                            value={centsToInput(option.currentPrice)}
                            onChange={(e) =>
                                onChange(
                                    replaceItem(options, index, {
                                        ...option,
                                        currentPrice: dollarsToCents(e.target.value),
                                    }),
                                )
                            }
                            fullWidth
                            helperText='Leave 0 to charge the full price.'
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        />
                    </Stack>
                    <Stack spacing={1}>
                        <Stack
                            direction='row'
                            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <Typography variant='subtitle2'>Selling points</Typography>
                            <Button
                                size='small'
                                onClick={() =>
                                    onChange(
                                        replaceItem(options, index, {
                                            ...option,
                                            sellingPoints: [
                                                ...(option.sellingPoints ?? []),
                                                emptySellingPoint(),
                                            ],
                                        }),
                                    )
                                }
                            >
                                Add selling point
                            </Button>
                        </Stack>
                        {(option.sellingPoints ?? []).map((sp, spIndex) => (
                            <Stack
                                key={spIndex}
                                direction='row'
                                sx={{ alignItems: 'center', gap: 1 }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={sp.included}
                                            onChange={(e) =>
                                                onChange(
                                                    replaceItem(options, index, {
                                                        ...option,
                                                        sellingPoints: replaceItem(
                                                            option.sellingPoints ?? [],
                                                            spIndex,
                                                            { ...sp, included: e.target.checked },
                                                        ),
                                                    }),
                                                )
                                            }
                                        />
                                    }
                                    label='Included'
                                />
                                <TextField
                                    label='Description'
                                    value={sp.description}
                                    onChange={(e) =>
                                        onChange(
                                            replaceItem(options, index, {
                                                ...option,
                                                sellingPoints: replaceItem(
                                                    option.sellingPoints ?? [],
                                                    spIndex,
                                                    { ...sp, description: e.target.value },
                                                ),
                                            }),
                                        )
                                    }
                                    fullWidth
                                />
                                <IconButton
                                    aria-label='Remove selling point'
                                    onClick={() =>
                                        onChange(
                                            replaceItem(options, index, {
                                                ...option,
                                                sellingPoints: removeItem(
                                                    option.sellingPoints ?? [],
                                                    spIndex,
                                                ),
                                            }),
                                        )
                                    }
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
            ))}
        </Stack>
    );
}

function centsToInput(cents: number): string {
    if (!cents) {
        return '';
    }
    return (cents / 100).toString();
}

function dollarsToCents(value: string): number {
    if (value.trim() === '') {
        return 0;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return 0;
    }
    return Math.round(n * 100);
}
