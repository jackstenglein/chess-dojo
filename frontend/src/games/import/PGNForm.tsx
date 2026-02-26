import { GameImportTypes } from '@jackstenglein/chess-dojo-common/src/database/game';
import { Clear } from '@mui/icons-material';
import {
    Button,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormHelperText,
    IconButton,
    OutlinedInput,
    TextField,
} from '@mui/material';
import React, { useRef, useState } from 'react';
import { ImportButton } from './ImportButton';
import { ImportDialogProps } from './ImportWizard';
import { OrDivider } from './OrDivider';

const pgnTextPlaceholder = `[Event "Classical game"]
[Site "https://lichess.org"]
[Date "2023.01.24"]
[White "MyUsername"]
[Black "OpponentUsername"]
[Result "1-0"]
[WhiteElo "1669"]
[BlackElo "1983"]

{ Before the game, I did some quick prep and saw that my opponent plays the Sicilian. I usually play the Alapin against the Sicilian and didn't see any reason to change that, so I rewatched a GothamChess video on the opening right before the game. }
1. e4 { [%clk 1:30:00] } 1... c5 { [%clk 1:30:00] } 2. c3 { [%clk 1:30:21] } 2... Nf6 { [%clk 1:30:18] }`;

export const PGNForm: React.FC<ImportDialogProps> = ({ onSubmit, loading, onClose }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [pgnText, setPgnText] = useState('');
    const [file, setFile] = useState<File>();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!file && pgnText.trim() === '') {
            setError('One field is required');
            return;
        }

        setError('');

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result?.toString() ?? '';
                onSubmit({ pgnText: text, type: GameImportTypes.manual });
            };
            reader.readAsText(file);
            return;
        }

        onSubmit({
            pgnText,
            type: GameImportTypes.manual,
        });
    };

    const handleFileClick = (e: React.MouseEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files?.[0]);
            setPgnText('');
        }
    };

    const clearFile = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setFile(undefined);
    };

    const handlePgnTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPgnText(e.target.value);
        setFile(undefined);
    };

    return (
        <>
            <DialogTitle sx={{ pb: 0 }}>Import PGN</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>Up to 100 games per file</DialogContentText>
                <FormControl error={!!error} fullWidth>
                    <OutlinedInput
                        onClick={handleFileClick}
                        value={file?.name || ''}
                        placeholder='Select a File'
                        fullWidth
                        size='small'
                        endAdornment={
                            file?.name ? (
                                <IconButton size='small' onClick={clearFile}>
                                    <Clear fontSize='inherit' />
                                </IconButton>
                            ) : undefined
                        }
                        sx={{ caretColor: 'transparent' }}
                        inputProps={{ style: { cursor: 'pointer' } }}
                    />
                    <FormHelperText>{error}</FormHelperText>
                </FormControl>
                <input
                    ref={inputRef}
                    type='file'
                    hidden
                    accept='.pgn'
                    onChange={handleFileChange}
                />

                <OrDivider />

                <TextField
                    data-testid='pgn-text'
                    label='Paste PGN'
                    placeholder={pgnTextPlaceholder}
                    value={pgnText}
                    onChange={handlePgnTextChange}
                    multiline
                    minRows={5}
                    maxRows={5}
                    error={!!error}
                    helperText={error}
                    fullWidth
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <ImportButton loading={loading} onClick={handleSubmit} />
            </DialogActions>
        </>
    );
};
