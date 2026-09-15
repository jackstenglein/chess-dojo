import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { Request } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import Avatar from '@/profile/Avatar';
import { PawnIcon } from '@/style/ChessIcons';
import {
    compareRoles,
    Directory,
    DirectoryAccessRole,
    DirectoryVisibilityType,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Add, CreateNewFolder } from '@mui/icons-material';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AddCurrentGameMenuItem } from './AddCurrentGameMenuItem';
import { AddExistingGamesDialog } from './AddExistingGamesDialog';
import { useDirectoryCache } from './DirectoryCache';
import { UpdateDirectoryDialog } from './UpdateDirectoryDialog';

export const AddButton = ({
    directory,
    accessRole,
}: {
    directory: Directory;
    accessRole?: DirectoryAccessRole;
}) => {
    const t = useTranslations('profile.directories');
    const cache = useDirectoryCache();
    const [anchorEl, setAnchorEl] = useState<HTMLElement>();
    const [newDirectoryOpen, setNewDirectoryOpen] = useState(false);
    const [existingGamesOpen, setExistingGamesOpen] = useState(false);
    const { user: viewer } = useAuth();
    const api = useApi();

    const canEdit = compareRoles(DirectoryAccessRole.Editor, accessRole);
    const canCreateNewFolders = compareRoles(DirectoryAccessRole.Admin, accessRole);

    if (!canEdit) {
        return null;
    }

    const handleClose = () => {
        setNewDirectoryOpen(false);
        setExistingGamesOpen(false);
        setAnchorEl(undefined);
    };

    const onNewDirectory = (
        name: string,
        visibility: DirectoryVisibilityType,
        disabled: boolean,
        request: Request,
    ) => {
        if (disabled || request.isLoading()) {
            return;
        }

        request.onStart();
        api.createDirectory({
            owner: directory.owner,
            parent: directory.id,
            name,
            visibility,
        })
            .then((resp) => {
                cache.put(resp.data.parent);
                cache.putWithAccess(resp.data.directory, resp.data.accessRole);
                trackEvent(EventType.CreateDirectory, { visibility });
                handleClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <Button
                variant='contained'
                startIcon={<Add />}
                onClick={(e) => setAnchorEl(e.currentTarget)}
            >
                {t('add')}
            </Button>

            <Menu open={!!anchorEl} onClose={handleClose} anchorEl={anchorEl}>
                <AddCurrentGameMenuItem directory={directory} onSuccess={handleClose} />

                <MenuItem disabled={!canCreateNewFolders} onClick={() => setNewDirectoryOpen(true)}>
                    <ListItemIcon>
                        <CreateNewFolder />
                    </ListItemIcon>
                    <ListItemText
                        primary={t('newFolder')}
                        secondary={canCreateNewFolders ? undefined : t('missingAdminPermissions')}
                    />
                </MenuItem>

                <MenuItem
                    component='a'
                    href={`/games/import?directory=${directory.id}&directoryOwner=${directory.owner}`}
                >
                    <ListItemIcon>
                        <PawnIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('newGame')} />
                </MenuItem>

                <MenuItem onClick={() => setExistingGamesOpen(true)}>
                    <ListItemIcon>
                        <Avatar user={viewer} size={20} />
                    </ListItemIcon>
                    <ListItemText primary={t('myExistingGames')} />
                </MenuItem>
            </Menu>

            {newDirectoryOpen && (
                <UpdateDirectoryDialog onSave={onNewDirectory} onCancel={handleClose} />
            )}
            {existingGamesOpen && (
                <AddExistingGamesDialog directory={directory} onCancel={handleClose} />
            )}
        </>
    );
};
