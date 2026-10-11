'use client';

import { Edit } from '@mui/icons-material';
import { ButtonBase, TextField } from '@mui/material';
import { useState } from 'react';
import { MAX_PUZZLE_RATING, parseRating } from './ratingBins';

interface RatingEditorProps {
    value: number;
    onChange: (rating: number) => void;
}

/**
 * A puzzle rating that turns into a number field when clicked. Enter or clicking away saves,
 * Escape cancels. Invalid entries are not saved.
 */
export function RatingEditor({ value, onChange }: RatingEditorProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    const parsed = parseRating(draft);

    const commit = () => {
        if (parsed !== undefined && parsed !== value) {
            onChange(parsed);
        }
        setEditing(false);
    };

    if (editing) {
        return (
            <TextField
                data-no-nav
                autoFocus
                size='small'
                type='number'
                value={draft}
                error={parsed === undefined}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEditing(false);
                }}
                onClick={(e) => e.stopPropagation()}
                slotProps={{
                    htmlInput: {
                        min: 0,
                        max: MAX_PUZZLE_RATING,
                        step: 50,
                        'aria-label': 'Puzzle rating',
                        sx: { py: 0.5, px: 1, width: 64, fontWeight: 'bold' },
                    },
                }}
            />
        );
    }

    return (
        <ButtonBase
            data-no-nav
            aria-label={`Rating ${value}. Click to edit.`}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDraft(String(value));
                setEditing(true);
            }}
            sx={{
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                fontWeight: 'bold',
                fontSize: 'inherit',
                fontVariantNumeric: 'tabular-nums',
                '& .edit-icon': { opacity: 0, transition: 'opacity .15s ease' },
                '&:hover, &:focus-visible': {
                    bgcolor: 'action.hover',
                    '& .edit-icon': { opacity: 0.7 },
                },
            }}
        >
            {value}
            <Edit className='edit-icon' sx={{ fontSize: 13 }} />
        </ButtonBase>
    );
}
