'use client';

import { PuzzlebaseContributor } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { Alert, Autocomplete, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { MemberMatch, PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

/** How long to wait after typing before searching, in ms. */
const SEARCH_DELAY_MS = 400;

interface AddContributorProps {
    client: PuzzlebaseClient;
    /** Usernames of people who are already contributors, who are left out of the results. */
    exclude: string[];
    /** Called with the new contributor once they have been added. */
    onAdded: (contributor: PuzzlebaseContributor) => void;
}

/** For admins: search for a member by name and make them a Puzzle Contributor straight away. */
export function AddContributor({ client, exclude, onAdded }: AddContributorProps) {
    const [input, setInput] = useState('');
    const [options, setOptions] = useState<MemberMatch[]>([]);
    const [selected, setSelected] = useState<MemberMatch | null>(null);
    const [searching, setSearching] = useState(false);
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string }>();

    const excluded = useMemo(() => new Set(exclude), [exclude]);

    useEffect(() => {
        const query = input.trim();
        if (query.length < 2) {
            setOptions([]);
            return;
        }
        let cancelled = false;
        setSearching(true);
        const timer = setTimeout(() => {
            client
                .searchMembers(query)
                .then((found) => {
                    if (!cancelled) setOptions(found);
                })
                .catch(() => {
                    if (!cancelled) setOptions([]);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, SEARCH_DELAY_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [client, input]);

    const add = async () => {
        if (!selected) return;
        setAdding(true);
        setMessage(undefined);
        try {
            const contributor = await client.addContributor(selected.username);
            onAdded(contributor);
            setMessage({
                severity: 'success',
                text: `${selected.displayName} is now a Puzzle Contributor.`,
            });
            setSelected(null);
            setInput('');
            setOptions([]);
        } catch (err) {
            setMessage({ severity: 'error', text: errorMessage(err) });
        } finally {
            setAdding(false);
        }
    };

    return (
        <Stack sx={{ gap: 1 }}>
            <Typography variant='overline' sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                Add a contributor
            </Typography>
            <Stack direction='row' sx={{ gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                    size='small'
                    sx={{ flexGrow: 1, maxWidth: 420 }}
                    options={options.filter((o) => !excluded.has(o.username))}
                    value={selected}
                    onChange={(_, value) => setSelected(value)}
                    inputValue={input}
                    onInputChange={(_, value) => setInput(value)}
                    getOptionLabel={(o) => o.displayName}
                    isOptionEqualToValue={(a, b) => a.username === b.username}
                    filterOptions={(x) => x}
                    loading={searching}
                    noOptionsText={
                        input.trim().length < 2
                            ? 'Type a name to search'
                            : searching
                              ? 'Searching…'
                              : 'No members found'
                    }
                    renderOption={({ key, ...props }, option) => (
                        <li key={option.username} {...props}>
                            <Stack>
                                <span>{option.displayName}</span>
                                <Typography variant='caption' color='text.secondary'>
                                    {option.username}
                                    {option.dojoCohort ? ` · ${option.dojoCohort}` : ''}
                                </Typography>
                            </Stack>
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label='Search members'
                            placeholder='Name or username'
                        />
                    )}
                />
                <Button
                    variant='contained'
                    disabled={!selected || adding}
                    onClick={() => void add()}
                >
                    Add
                </Button>
            </Stack>
            {message && (
                <Alert severity={message.severity} onClose={() => setMessage(undefined)}>
                    {message.text}
                </Alert>
            )}
        </Stack>
    );
}
