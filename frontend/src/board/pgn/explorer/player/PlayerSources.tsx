import { AddCircle, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import {
    Button,
    IconButton,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import { DEFAULT_PLAYER_SOURCE, PlayerSource, SourceType } from './PlayerSource';

export function PlayerSources({
    sources,
    setSources,
    locked,
    onClear,
}: {
    sources: PlayerSource[];
    setSources: (s: PlayerSource[]) => void;
    locked: boolean;
    onClear: () => void;
}) {
    const t = useTranslations('analysisBoard.explorer.player');

    const handleTypeChange = (value: SourceType | null, index: number) => {
        if (!value) return;

        setSources([
            ...sources.slice(0, index),
            { ...sources[index], type: value },
            ...sources.slice(index + 1),
        ]);
    };

    const handleUsernameChange = (value: string, index: number) => {
        setSources([
            ...sources.slice(0, index),
            { ...sources[index], username: value },
            ...sources.slice(index + 1),
        ]);
    };

    const onAddSource = () => {
        setSources(sources.concat(DEFAULT_PLAYER_SOURCE));
    };

    const onDeleteSource = (index: number) => {
        setSources([...sources.slice(0, index), ...sources.slice(index + 1)]);
    };

    const onHideSource = (hidden: boolean, index: number) => {
        setSources([
            ...sources.slice(0, index),
            { ...sources[index], hidden },
            ...sources.slice(index + 1),
        ]);
    };

    return (
        <Stack
            spacing={1}
            sx={{
                mt: 1,
            }}
        >
            {sources.map((source, i) => (
                <Stack
                    key={i}
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'start',
                    }}
                >
                    <ToggleButtonGroup
                        value={source.type}
                        exclusive
                        onChange={(_, value: SourceType | null) => handleTypeChange(value, i)}
                        size='small'
                        disabled={locked}
                        sx={{ pt: '3px' }}
                    >
                        <Tooltip title={t('chesscomLabel')}>
                            <ToggleButton value={SourceType.Chesscom}>
                                <SiChessdotcom color='#81b64c' size='18' />
                            </ToggleButton>
                        </Tooltip>

                        <Tooltip title={t('lichessLabel')}>
                            <ToggleButton value={SourceType.Lichess}>
                                <SiLichess size='18' />
                            </ToggleButton>
                        </Tooltip>
                    </ToggleButtonGroup>

                    <TextField
                        placeholder={
                            source.type === SourceType.Chesscom
                                ? t('chesscomUsernamePlaceholder')
                                : t('lichessUsernamePlaceholder')
                        }
                        value={source.username}
                        onChange={(e) => handleUsernameChange(e.target.value, i)}
                        error={source.hasError || !!source.error}
                        helperText={source.error}
                        sx={{ flexGrow: 1 }}
                        size='small'
                        disabled={locked}
                    />

                    {locked ? (
                        <Tooltip
                            title={source.hidden ? t('showSourceTooltip') : t('hideSourceTooltip')}
                            disableInteractive
                        >
                            <span style={{ paddingTop: '3px' }}>
                                <IconButton
                                    onClick={() => onHideSource(!source.hidden, i)}
                                    disabled={sources.length === 1}
                                    size='small'
                                    sx={{ color: 'text.secondary' }}
                                >
                                    {source.hidden ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip title={t('removeSourceTooltip')} disableInteractive>
                            <span style={{ paddingTop: '3px' }}>
                                <IconButton
                                    onClick={() => onDeleteSource(i)}
                                    disabled={sources.length === 1}
                                    size='small'
                                    sx={{ color: 'text.secondary' }}
                                >
                                    <Delete />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Stack>
            ))}

            {locked ? (
                <Button
                    startIcon={<Delete />}
                    onClick={onClear}
                    sx={{ alignSelf: 'start' }}
                    size='small'
                    color='error'
                >
                    {t('clearDataButton')}
                </Button>
            ) : (
                <Button
                    startIcon={<AddCircle />}
                    onClick={onAddSource}
                    sx={{ alignSelf: 'start' }}
                    size='small'
                >
                    {t('addSourceButton')}
                </Button>
            )}
        </Stack>
    );
}
