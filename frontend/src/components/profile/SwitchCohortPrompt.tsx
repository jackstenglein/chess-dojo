import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import {
    getPartialUserHideCohortPrompt,
    isCohortPromptHidden,
    shouldPromptDemotion,
} from '@/database/user';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Alert, Button, Snackbar, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '../navigation/Link';

/**
 * Renders a prompt telling the current user to demote themselves,
 * if necessary. Prompts to graduate are handled separately and
 * displayed as tasks in the daily training plan view.
 */
export function SwitchCohortPrompt() {
    const t = useTranslations('profile.switchCohort');
    const { user } = useAuth();
    const api = useApi();

    const [open, setOpen] = useState(false);
    const [forceClose, setForceClose] = useState(false);

    useEffect(() => {
        if (forceClose) {
            return;
        }

        const userHasHiddenCohortPrompt = isCohortPromptHidden(user);
        if (userHasHiddenCohortPrompt) {
            setOpen(false);
            return;
        }

        const promptDemotion = shouldPromptDemotion(user);
        if (promptDemotion) {
            setOpen(true);
            return;
        }

        setOpen(false);
    }, [user, forceClose]);

    const handleHideCohortPrompt = () => {
        const partialUser = getPartialUserHideCohortPrompt(user);
        void api.updateUser(partialUser);
        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
        setForceClose(true);
    };

    return (
        <Snackbar
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            open={open}
            onClose={handleClose}
            autoHideDuration={7000}
        >
            <Alert
                variant='filled'
                severity='error'
                action={
                    <Stack direction='row'>
                        <Button color='inherit' size='small' onClick={handleHideCohortPrompt}>
                            {t('hideForMonth')}
                        </Button>
                        <Button
                            color='inherit'
                            size='small'
                            href='/profile/edit'
                            sx={{ ml: 2, px: 3 }}
                            endIcon={<NavigateNextIcon />}
                            component={Link}
                        >
                            {t('settings')}
                        </Button>
                    </Stack>
                }
                sx={{ width: 1 }}
            >
                {t('ratingBelowMinimum')}
            </Alert>
        </Snackbar>
    );
}
