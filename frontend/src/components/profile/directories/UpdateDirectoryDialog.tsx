import { EventType, trackEvent } from '@/analytics/events';
import { ApiContextType } from '@/api/Api';
import { Request, RequestSnackbar, useRequest } from '@/api/Request';
import { useFreeTier } from '@/auth/Auth';
import {
    Directory,
    DirectoryItem,
    DirectoryItemTypes,
    DirectoryVisibility,
    DirectoryVisibilityType,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Help } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
    TextField,
    Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { DirectoryCacheContextType } from './DirectoryCache';

const defaultDisableSave = (name: string) => name.trim().length === 0 || name.trim().length > 100;

export const UpdateDirectoryDialog = ({
    initialName = '',
    initialVisibility = DirectoryVisibility.PUBLIC,
    title = 'New Folder',
    saveLabel = 'Create',
    disableSave = defaultDisableSave,
    onSave,
    onCancel,
}: {
    initialName?: string;
    initialVisibility?: DirectoryVisibilityType;
    title?: string;
    saveLabel?: string;
    disableSave?: (name: string, visibility: DirectoryVisibilityType) => boolean;
    onSave: (
        name: string,
        visibility: DirectoryVisibilityType,
        disabled: boolean,
        request: Request,
    ) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState(initialName);
    const [visibility, setVisibility] = useState<DirectoryVisibilityType>(initialVisibility);
    const request = useRequest();
    const isFreeTier = useFreeTier();
    const disabled = disableSave(name, visibility);

    return (
        <Dialog open={true} onClose={request.isLoading() ? undefined : onCancel} fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent data-testid='update-directory-form'>
                <TextField
                    data-testid='update-directory-name'
                    label='Name'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !disabled) {
                            onSave(name, visibility, disabled, request);
                        }
                    }}
                    fullWidth
                    sx={{ mt: 0.75, mb: 3 }}
                    helperText={`${name.trim().length} / 100 characters`}
                    error={name.trim().length > 100}
                    autoFocus
                />

                <FormControl>
                    <FormLabel>
                        Visibility{' '}
                        <Tooltip title='Private folders are visible only to you. Public folders are visible on your profile to everyone. Unlisted games added to a public folder are also visible to everyone.'>
                            <Help fontSize='inherit' sx={{ verticalAlign: 'middle' }} />
                        </Tooltip>
                    </FormLabel>
                    <RadioGroup
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as DirectoryVisibilityType)}
                        row
                    >
                        <FormControlLabel
                            value={DirectoryVisibility.PUBLIC}
                            control={<Radio />}
                            label='Public'
                            disabled={isFreeTier}
                        />
                        <FormControlLabel
                            value={DirectoryVisibility.PRIVATE}
                            control={<Radio />}
                            label='Private'
                            disabled={isFreeTier}
                        />
                    </RadioGroup>
                    {isFreeTier && (
                        <FormHelperText>
                            Free-tier users cannot create private folders
                        </FormHelperText>
                    )}
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onCancel}>
                    Cancel
                </Button>
                <LoadingButton
                    disabled={disabled}
                    loading={request.isLoading()}
                    onClick={() => onSave(name, visibility, disabled, request)}
                    data-testid='update-directory-save-button'
                >
                    {saveLabel}
                </LoadingButton>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
};

export const onUpdateDirectory =
    (
        api: ApiContextType,
        cache: DirectoryCacheContextType,
        directory: Directory,
        selectedItem: DirectoryItem,
        handleClose: () => void,
    ) =>
    (name: string, visibility: DirectoryVisibilityType, disabled: boolean, request: Request) => {
        if (disabled || request.isLoading()) {
            return;
        }

        if (
            Object.values(directory.items || {}).some(
                (item) =>
                    item.type === DirectoryItemTypes.DIRECTORY &&
                    item.metadata.name === name &&
                    item.id !== selectedItem.id,
            )
        ) {
            request.onFailure({ message: `${directory.name}/${name} already exists` });
            return;
        }

        request.onStart();
        api.updateDirectory({
            owner:
                directory.id === SHARED_DIRECTORY_ID
                    ? selectedItem.addedBy || directory.owner
                    : directory.owner,
            id: selectedItem.id,
            name,
            visibility,
        })
            .then((resp) => {
                cache.put(resp.data.directory);
                if (resp.data.parent) {
                    cache.put(resp.data.parent);
                }
                trackEvent(EventType.UpdateDirectory, { visibility });
                handleClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };
