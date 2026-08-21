import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { PatScope, PersonalAccessToken } from '@/database/pat';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyIcon from '@mui/icons-material/Key';
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

function formatDate(date?: string): string {
    if (!date) {
        return '—';
    }
    return new Date(date).toLocaleDateString();
}

const expirationOptions = [
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
    { label: '1 year', value: 365 },
    { label: 'No expiration', value: 0 },
];

/**
 * Renders the Personal Access Tokens section of the profile editor. Tokens
 * allow third-party integrations (Eg: the ChessAgine MCP server) to access
 * the ChessDojo API on the user's behalf.
 */
export function PersonalAccessTokensEditor() {
    const api = useApi();
    const listRequest = useRequest<PersonalAccessToken[]>();
    const createRequest = useRequest();
    const deleteRequest = useRequest<string>();

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [readScope, setReadScope] = useState(true);
    const [writeScope, setWriteScope] = useState(false);
    const [expirationDays, setExpirationDays] = useState(90);
    const [newToken, setNewToken] = useState('');
    const [copied, setCopied] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PersonalAccessToken>();

    useEffect(() => {
        if (!listRequest.isSent()) {
            listRequest.onStart();
            api.listPersonalAccessTokens()
                .then((resp) => listRequest.onSuccess(resp.data.tokens))
                .catch(listRequest.onFailure);
        }
    }, [api, listRequest]);

    const tokens = listRequest.data ?? [];

    const openCreateDialog = () => {
        createRequest.reset();
        setName('');
        setReadScope(true);
        setWriteScope(false);
        setExpirationDays(90);
        setNewToken('');
        setCopied(false);
        setCreateOpen(true);
    };

    const closeCreateDialog = () => {
        if (createRequest.isLoading()) {
            return;
        }
        setCreateOpen(false);
        setNewToken('');
    };

    const canCreate = name.trim() !== '' && (readScope || writeScope);

    const onCreate = () => {
        if (!canCreate || createRequest.isLoading()) {
            return;
        }

        const scopes: PatScope[] = [];
        if (readScope) {
            scopes.push(PatScope.Read);
        }
        if (writeScope) {
            scopes.push(PatScope.Write);
        }

        createRequest.onStart();
        api.createPersonalAccessToken({ name: name.trim(), scopes, expirationDays })
            .then((resp) => {
                createRequest.onSuccess();
                setNewToken(resp.data.accessToken);
                listRequest.onSuccess([...tokens, resp.data.token]);
            })
            .catch(createRequest.onFailure);
    };

    const onCopyToken = () => {
        void navigator.clipboard.writeText(newToken);
        setCopied(true);
    };

    const onDelete = () => {
        if (!deleteTarget || deleteRequest.isLoading()) {
            return;
        }

        deleteRequest.onStart();
        api.deletePersonalAccessToken(deleteTarget.id)
            .then(() => {
                deleteRequest.onSuccess('Access token deleted');
                listRequest.onSuccess(tokens.filter((t) => t.id !== deleteTarget.id));
                setDeleteTarget(undefined);
            })
            .catch(deleteRequest.onFailure);
    };

    return (
        <Stack id='pat' spacing={2} sx={{ scrollMarginTop: 'calc(var(--navbar-height) + 8px)' }}>
            <RequestSnackbar request={listRequest} />
            <RequestSnackbar request={deleteRequest} showSuccess />

            <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                flexWrap='wrap'
            >
                <Typography variant='h5'>
                    <KeyIcon
                        fontSize='inherit'
                        sx={{ verticalAlign: 'middle', marginRight: '0.1em' }}
                    />{' '}
                    Personal Access Tokens
                </Typography>
                <Button variant='contained' startIcon={<AddIcon />} onClick={openCreateDialog}>
                    New Token
                </Button>
            </Stack>

            <Typography color='text.secondary'>
                Personal access tokens allow third-party integrations, such as MCP servers, to
                access the ChessDojo API on your behalf. Treat tokens like passwords and never share
                them with anyone you don't trust.
            </Typography>

            {tokens.length === 0 ? (
                <Typography color='text.secondary' fontStyle='italic'>
                    You have no personal access tokens.
                </Typography>
            ) : (
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Token</TableCell>
                            <TableCell>Scopes</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Expires</TableCell>
                            <TableCell>Last Used</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tokens.map((token) => (
                            <TableRow key={token.id}>
                                <TableCell>{token.name}</TableCell>
                                <TableCell>
                                    <Typography variant='body2' fontFamily='monospace'>
                                        {token.displayPrefix}…
                                    </Typography>
                                </TableCell>
                                <TableCell>{token.scopes.join(', ')}</TableCell>
                                <TableCell>{formatDate(token.createdAt)}</TableCell>
                                <TableCell>
                                    {token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
                                </TableCell>
                                <TableCell>{formatDate(token.lastUsedAt)}</TableCell>
                                <TableCell align='right'>
                                    <Tooltip title='Delete token'>
                                        <IconButton
                                            color='error'
                                            size='small'
                                            onClick={() => setDeleteTarget(token)}
                                        >
                                            <DeleteIcon fontSize='small' />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={createOpen} onClose={closeCreateDialog} fullWidth maxWidth='sm'>
                {newToken ? (
                    <>
                        <DialogTitle>Token Created</DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} mt={1}>
                                <Alert severity='warning'>
                                    Copy your token now. For security reasons, it will never be
                                    shown again.
                                </Alert>
                                <TextField
                                    value={newToken}
                                    fullWidth
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            sx: { fontFamily: 'monospace' },
                                            endAdornment: (
                                                <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                                                    <IconButton onClick={onCopyToken}>
                                                        <ContentCopyIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            ),
                                        },
                                    }}
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeCreateDialog}>Done</Button>
                        </DialogActions>
                    </>
                ) : (
                    <>
                        <DialogTitle>New Personal Access Token</DialogTitle>
                        <DialogContent>
                            <RequestSnackbar request={createRequest} />
                            <Stack spacing={3} mt={1}>
                                <TextField
                                    label='Name'
                                    placeholder='Eg: ChessAgine MCP'
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    fullWidth
                                    autoFocus
                                />
                                <FormGroup>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={readScope}
                                                onChange={(e) => setReadScope(e.target.checked)}
                                            />
                                        }
                                        label='Read — view your profile, training plan and progress'
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={writeScope}
                                                onChange={(e) => setWriteScope(e.target.checked)}
                                            />
                                        }
                                        label='Write — update your progress on tasks'
                                    />
                                </FormGroup>
                                <TextField
                                    select
                                    label='Expiration'
                                    value={expirationDays}
                                    onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                                >
                                    {expirationOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={closeCreateDialog}>Cancel</Button>
                            <Button
                                variant='contained'
                                disabled={!canCreate}
                                loading={createRequest.isLoading()}
                                onClick={onCreate}
                            >
                                Generate Token
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(undefined)}>
                <DialogTitle>Delete access token?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Any integrations using the token "{deleteTarget?.name}" will immediately
                        lose access to your account. This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
                    <Button color='error' loading={deleteRequest.isLoading()} onClick={onDelete}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
