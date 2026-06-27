import { useAuth } from '@/auth/Auth';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { SHARED_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { MoreHoriz, NavigateNext } from '@mui/icons-material';
import {
    Breadcrumbs,
    IconButton,
    Link,
    Menu,
    MenuItem,
    Stack,
    Tooltip,
    Typography,
    TypographyOwnProps,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BreadcrumbItem, useBreadcrumbs } from './DirectoryCache';

const MAX_ITEM_LENGTH = 50;

export const DirectoryBreadcrumbs = ({
    owner,
    id,
    currentProfile,
    onClick,
    maxItems = 3,
    variant = 'h6',
}: {
    owner: string;
    id: string;
    currentProfile?: string;
    onClick?: (item: BreadcrumbItem) => void;
    maxItems?: number;
    variant?: TypographyOwnProps['variant'];
}) => {
    const t = useTranslations('profile.directories');
    const { user } = useAuth();
    const { updateSearchParams } = useNextSearchParams();
    const currentBreadcrumbs = useBreadcrumbs(owner, id, currentProfile);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement>();

    if (currentBreadcrumbs.length === 0) {
        return null;
    }

    let hiddenBreadcrumbs = 0;
    if (currentBreadcrumbs.length > maxItems) {
        hiddenBreadcrumbs = Math.max(2, currentBreadcrumbs.length - maxItems);
    }

    const handleClick = (item: BreadcrumbItem) => {
        setMenuAnchor(undefined);
        if (onClick) {
            onClick(item);
        } else {
            const newParams: Record<string, string> = { directory: item.id };
            if (item.id === SHARED_DIRECTORY_ID) {
                newParams.directoryOwner = user?.username || '';
            }
            updateSearchParams(newParams);
        }
    };

    return (
        <Stack spacing={1} direction='row' alignItems='center'>
            {hiddenBreadcrumbs > 0 && (
                <>
                    <Tooltip title={t('showPath')}>
                        <IconButton size='small' onClick={(e) => setMenuAnchor(e.currentTarget)}>
                            <MoreHoriz fontSize='inherit' sx={{ color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>

                    <NavigateNext sx={{ color: 'text.secondary' }} />

                    <Menu
                        open={!!menuAnchor}
                        anchorEl={menuAnchor}
                        onClose={() => setMenuAnchor(undefined)}
                    >
                        {currentBreadcrumbs.slice(0, hiddenBreadcrumbs).map((b) => (
                            <Tooltip
                                key={b.id}
                                title={b.name.length > MAX_ITEM_LENGTH ? b.name : ''}
                            >
                                <MenuItem key={b.id} onClick={() => handleClick(b)}>
                                    {b.name.slice(0, MAX_ITEM_LENGTH)}
                                    {b.name.length > MAX_ITEM_LENGTH && '...'}
                                </MenuItem>
                            </Tooltip>
                        ))}
                    </Menu>
                </>
            )}

            <Breadcrumbs separator={<NavigateNext fontSize='small' />}>
                {currentBreadcrumbs.slice(hiddenBreadcrumbs).map((b) => (
                    <Tooltip key={b.id} title={b.name.length > MAX_ITEM_LENGTH ? b.name : ''}>
                        <Typography variant={variant}>
                            <Link
                                key={b.id}
                                underline='hover'
                                color='inherit'
                                onClick={() => handleClick(b)}
                                sx={{ cursor: 'pointer' }}
                            >
                                {b.name.slice(0, MAX_ITEM_LENGTH)}
                                {b.name.length > MAX_ITEM_LENGTH && '...'}
                            </Link>
                        </Typography>
                    </Tooltip>
                ))}
            </Breadcrumbs>
        </Stack>
    );
};
