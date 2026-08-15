'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import ScoreboardViewSelector from '@/components/scoreboard/ScoreboardViewSelector';
import { isCustom, RatingSystem, User } from '@/database/user';
import Avatar from '@/profile/Avatar';
import {
    Checkbox,
    Container,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams, GridRowModel } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getAllColumns(t: (key: string) => string): GridColDef<User>[] {
    return [
        {
            field: 'dojoCohort',
            headerName: t('cohort'),
            valueGetter: (_value, row: User) => row.dojoCohort,
            minWidth: 125,
        },
        {
            field: 'display',
            headerName: t('displayName'),
            valueGetter: (_value, row: User) => row.displayName,
            renderCell: (params: GridRenderCellParams<User, string>) => {
                return (
                    <Stack
                        direction='row'
                        spacing={1}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Avatar
                            username={params.row.username}
                            displayName={params.value}
                            size={32}
                        />
                        <Link href={`/profile/${params.row.username}`}>{params.value}</Link>
                    </Stack>
                );
            },
            minWidth: 250,
            flex: 1,
        },
        {
            field: 'discord',
            headerName: t('discordUsername'),
            valueGetter: (_value, row: User) => row.discordUsername,
            flex: 1,
        },
        {
            field: RatingSystem.Chesscom,
            headerName: t('chesscomUsername'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Chesscom]?.username,
            flex: 1,
            minWidth: 175,
        },
        {
            field: RatingSystem.Lichess,
            headerName: t('lichessUsername'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Lichess]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Fide,
            headerName: t('fideId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Fide]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Uscf,
            headerName: t('uscfId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Uscf]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Cfc,
            headerName: t('cfcId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Cfc]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Ecf,
            headerName: t('ecfId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Ecf]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Dwz,
            headerName: t('dwzId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Dwz]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Acf,
            headerName: t('acfId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Acf]?.username,
            flex: 1,
        },
        {
            field: RatingSystem.Knsb,
            headerName: t('knsbId'),
            valueGetter: (_value, row: User) => row.ratings[RatingSystem.Knsb]?.username,
            flex: 1,
        },
    ];
}

const SearchFields = ['display', 'discord', ...Object.values(RatingSystem)];

function getDisplayString(field: string, t: (key: string) => string): string {
    switch (field) {
        case 'display':
            return t('displayName');
        case 'discord':
            return t('discordUsername');
        case RatingSystem.Chesscom:
            return t('chesscomUsername');
        case RatingSystem.Lichess:
            return t('lichessUsername');
        case RatingSystem.Fide:
            return t('fideId');
        case RatingSystem.Uscf:
            return t('uscfId');
        case RatingSystem.Cfc:
            return t('cfcId');
        case RatingSystem.Ecf:
            return t('ecfId');
        case RatingSystem.Dwz:
            return t('dwzId');
        case RatingSystem.Acf:
            return t('acfId');
        case RatingSystem.Knsb:
            return t('knsbId');
    }
    return '';
}

function useDebounce(effect: () => void, dependencies: React.DependencyList, delay: number) {
    // eslint-disable-next-line react-hooks/use-memo
    const callback = useCallback(effect, [effect, ...dependencies]);

    useEffect(() => {
        const timeout = setTimeout(callback, delay);
        return () => clearTimeout(timeout);
    }, [callback, delay]);
}

export function SearchPage() {
    const t = useTranslations('scoreboard.search');
    const api = useApi();
    const request = useRequest<User[]>();

    const allCols = useMemo(() => getAllColumns(t), [t]);

    const [query, setQuery] = useState('');
    const [allFields, setAllFields] = useState(true);
    const [fields, setFields] = useState<Record<string, boolean>>(
        SearchFields.reduce<Record<string, boolean>>((map, field) => {
            map[field] = false;
            return map;
        }, {}),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [columns, setColumns] = useState<GridColDef<User>[]>(allCols);
    const latestSearch = useRef<{ fields: string[]; query: string }>({
        fields: [],
        query,
    });

    const onChangeField = (field: string, value: boolean) => {
        setFields({
            ...fields,
            [field]: value,
        });
    };

    const searchUsers = api.searchUsers;
    const onStart = request.onStart;
    const onSuccess = request.onSuccess;
    const onFailure = request.onFailure;
    const handleSearch = useCallback(() => {
        const newErrors: Record<string, string> = {};
        const selectedFields = allFields ? ['all'] : Object.keys(fields).filter((f) => fields[f]);
        if (selectedFields.length === 0) {
            newErrors.fields = t('fieldRequired');
        }

        setErrors(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }

        if (query.trim() === '') {
            onSuccess();
            return;
        }

        onStart();

        if (allFields) {
            setColumns(allCols);
        } else {
            setColumns(allCols.filter((c, i) => i <= 1 || fields[c.field]));
        }

        latestSearch.current = { fields: selectedFields, query: query.trim() };
        searchUsers(query.trim(), selectedFields)
            .then((resp) => {
                if (
                    latestSearch.current.fields === selectedFields &&
                    latestSearch.current.query === query.trim()
                ) {
                    onSuccess(resp);
                }
            })
            .catch((err) => {
                onFailure(err);
            });
    }, [allFields, allCols, fields, query, searchUsers, onStart, onSuccess, onFailure, t]);

    useDebounce(handleSearch, [], 300);

    return (
        <Container maxWidth='xl' sx={{ pt: 4, pb: 4 }}>
            <RequestSnackbar request={request} />

            <Stack spacing={4}>
                <ScoreboardViewSelector value='search' />

                <Stack
                    spacing={1}
                    sx={{
                        alignItems: 'start',
                    }}
                >
                    <TextField
                        data-testid='search-query'
                        label={t('searchQuery')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        fullWidth
                        error={!!errors.query}
                        helperText={errors.query}
                    />

                    <Stack>
                        <Typography
                            variant='subtitle1'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {t('helperText')}
                        </Typography>
                        <FormControl error={!!errors.fields}>
                            <FormControlLabel
                                data-testid='search-field'
                                control={
                                    <Checkbox
                                        checked={allFields}
                                        onChange={(event) => setAllFields(event.target.checked)}
                                    />
                                }
                                label={t('allFields')}
                            />
                            <Stack direction='row' sx={{ flexWrap: 'wrap', columnGap: 2.5 }}>
                                {SearchFields.map((field) => {
                                    if (isCustom(field)) {
                                        return null;
                                    }
                                    return (
                                        <FormControlLabel
                                            data-testid='search-field'
                                            key={field}
                                            control={
                                                <Checkbox
                                                    checked={allFields || fields[field]}
                                                    onChange={(event) =>
                                                        onChangeField(field, event.target.checked)
                                                    }
                                                />
                                            }
                                            disabled={allFields}
                                            label={getDisplayString(field, t)}
                                        />
                                    );
                                })}
                            </Stack>
                            <FormHelperText>{errors.fields}</FormHelperText>
                        </FormControl>
                    </Stack>
                </Stack>

                {request.data && (
                    <DataGridPro
                        autoHeight
                        columns={columns}
                        rows={request.data ?? []}
                        pageSizeOptions={[5, 10, 25]}
                        initialState={{
                            pagination: {
                                paginationModel: {
                                    page: 0,
                                    pageSize: 10,
                                },
                            },
                        }}
                        getRowId={(row: GridRowModel<User>) => row.username}
                        pagination
                        slotProps={{
                            root: { 'data-testid': 'search-results' },
                        }}
                    />
                )}
            </Stack>
        </Container>
    );
}
