import { Request } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useDirectory } from '@/components/profile/directories/DirectoryCache';
import {
    HOME_DIRECTORY_ID,
    isManagedDirectory,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { FolderOutlined } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DirectorySelectDialog } from './DirectorySelectDialog';

export function DirectorySelectButton<T>({
    request,
    initialDirectory,
    showDirectoryName,
    onSelect,
    slotProps,
}: {
    /** The API request, if any associated with this directory select. */
    request?: Request<T>;

    /** The initial directory to have selected. */
    initialDirectory?: { owner: string; id: string };

    /** Show the selected directory name in the button instead of the default Add to Folder title. */
    showDirectoryName?: boolean;

    /**
     * Callback invoked when the user clicks the confirm button in the dialog.
     * Returns true if the dialog should close.
     */
    onSelect: (directory: { owner: string; id: string }) => Promise<boolean>;

    /** Props for slots in the component. */
    slotProps?: {
        /** Props for the button that opens the dialog. */
        button?: ButtonProps;
        /** Props for slots in the dialog. */
        dialog?: {
            /** Props for the dialog confirm button. */
            confirmButton?: ButtonProps;
        };
    };
}) {
    const t = useTranslations('profile.directories.select.button');
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [directoryInfo, setDirectoryInfo] = useState(
        initialDirectory || {
            owner: user?.username || '',
            id: HOME_DIRECTORY_ID,
        },
    );
    const { directory } = useDirectory(directoryInfo.owner, directoryInfo.id);

    const onChange = (value: { owner: string; id: string }) => {
        if (request?.isLoading()) {
            return;
        }

        setDirectoryInfo(value);
        request?.reset();
    };

    const onCancel = () => {
        setOpen(false);
        setDirectoryInfo(
            initialDirectory || { owner: user?.username || '', id: HOME_DIRECTORY_ID },
        );
        request?.reset();
    };

    const onConfirm = async () => {
        const shouldClose = await onSelect(directoryInfo);
        setOpen(!shouldClose);
    };

    if (!user) {
        return null;
    }

    return (
        <>
            <Button
                variant='contained'
                startIcon={<FolderOutlined />}
                {...slotProps?.button}
                onClick={() => setOpen(true)}
            >
                {slotProps?.button?.children ||
                    (showDirectoryName && directory?.name) ||
                    t('addToFolder')}
            </Button>

            <DirectorySelectDialog
                slotProps={{
                    dialog: {
                        open,
                        onClose: request?.isLoading() ? undefined : onCancel,
                        fullWidth: true,
                    },
                    dialogTitle: {
                        children: t('addCurrentGameTitle', {
                            directoryName: directory?.name || t('fallbackFolderName'),
                        }),
                    },
                    dialogActions: {
                        children: (
                            <>
                                <Button onClick={request?.isLoading() ? undefined : onCancel}>
                                    {t('cancel')}
                                </Button>
                                <Button
                                    loading={request?.isLoading()}
                                    onClick={onConfirm}
                                    disabled={isManagedDirectory(directoryInfo.id)}
                                    {...slotProps?.dialog?.confirmButton}
                                >
                                    {slotProps?.dialog?.confirmButton?.children || t('addButton')}
                                </Button>
                            </>
                        ),
                    },
                }}
                value={directoryInfo}
                onChange={onChange}
            />
        </>
    );
}
