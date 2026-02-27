import { BlockBoardKeyboardShortcuts } from '@/board/pgn/PgnBoard';
import { logger } from '@/logging/logger';
import { Chess } from '@jackstenglein/chess';
import { GameImportTypes } from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    Autocomplete,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useRequirements } from '../../api/cache/requirements';
import { useFreeTier } from '../../auth/Auth';
import { ALL_COHORTS } from '../../database/user';
import { BoardEditor } from './BoardEditor';
import { ImportButton } from './ImportButton';
import { ImportDialogProps } from './ImportWizard';

interface PositionFormOption {
    label: string;
    fen: string;
    id: string;
    category: string;
    sortPriority: string;
}

export const PositionForm = ({ loading, onSubmit, onClose }: ImportDialogProps) => {
    const [inputValue, setInputValue] = useState('');
    const [fen, setFen] = useState<string>('');
    const [error, setError] = useState<string>('');

    const isFreeTier = useFreeTier();
    const { requirements } = useRequirements(ALL_COHORTS, true);
    const positions = useMemo(() => {
        return requirements.flatMap((requirement) => {
            if (isFreeTier && !requirement.isFree) {
                return [];
            }

            return (
                requirement.positions?.map((position) => ({
                    label: `${requirement.name} - ${position.title}`,
                    fen: position.fen,
                    id: `${requirement.id}-${position.title}`,
                    category: requirement.category,
                    sortPriority: requirement.sortPriority,
                })) ?? []
            );
        });
    }, [requirements, isFreeTier]);

    const getOptionLabel = (option: string | PositionFormOption) => {
        if (typeof option === 'string') {
            return option;
        }

        return option.label;
    };

    const changeFen = (value: string | PositionFormOption | null) => {
        setError('');

        if (!value) {
            setFen('');
        } else if (typeof value === 'string') {
            try {
                setFen(value);
                const valueTokens = value.split(' ');
                const position = positions.find((p) => {
                    const pTokens = p.fen.split(' ');
                    return pTokens.slice(0, 4).every((token, idx) => token === valueTokens[idx]);
                });
                if (position) {
                    setInputValue(getOptionLabel(position));
                } else {
                    setInputValue(value);
                }
            } catch {
                setFen('');
            }
        } else {
            setFen(value.fen);
        }
    };

    const handleSubmit = () => {
        try {
            const chess = new Chess({ fen });
            onSubmit({
                pgnText: chess.pgn.render(),
                type: GameImportTypes.fen,
            });
        } catch (err) {
            logger.warn?.(`Invalid FEN: `, err);
            setError('Invalid FEN');
        }
    };

    const onChangeBoard = (value: string) => {
        changeFen(value);
    };

    const onBlur = () => {
        try {
            if (inputValue) {
                new Chess({ fen: inputValue });
                changeFen(inputValue);
            }
        } catch {
            // Input value is not a FEN, so we shouldn't do anything
        }
    };

    return (
        <>
            <DialogTitle>Custom Position</DialogTitle>
            <DialogContent>
                <Stack mt={0.8} spacing={2} alignItems='center'>
                    <Autocomplete
                        id={BlockBoardKeyboardShortcuts}
                        sx={{ width: 1 }}
                        options={positions}
                        getOptionLabel={getOptionLabel}
                        groupBy={(option) => option.category}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label='Choose Position or Paste FEN'
                                error={!!error}
                                helperText={error}
                            />
                        )}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        onChange={(_, value) => changeFen(value)}
                        inputValue={inputValue}
                        onInputChange={(_e, value) => {
                            setInputValue(value);
                        }}
                        onBlur={onBlur}
                        data-testid='position-entry'
                        freeSolo
                        selectOnFocus
                        blurOnSelect
                    />

                    <BoardEditor fen={fen} onUpdate={onChangeBoard} />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <ImportButton loading={loading} onClick={handleSubmit} />
            </DialogActions>
        </>
    );
};
