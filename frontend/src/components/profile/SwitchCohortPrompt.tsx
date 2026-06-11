import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import {
    getPartialUserHideCohortPrompt,
    getSuggestedCohorts,
    isCohortPromptHidden,
    shouldPromptDemotion,
} from '@/database/user';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
    Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const CURRENT_COHORT_VERSION = '2026';

/**
 * Renders a prompt telling the current user to demote themselves or switch cohorts,
 * if necessary. Prompts to graduate are handled separately and
 * displayed as tasks in the daily training plan view.
 */
export function SwitchCohortPrompt() {
    const { user } = useAuth();
    const api = useApi();

    const [open, setOpen] = useState(false);
    const [forceClose, setForceClose] = useState(false);

    const [oldSuggestedCohort, newCohort] = getSuggestedCohorts(user);
    const currentCohort = user?.dojoCohort;
    const request = useRequest();

    const showSwitchCohorts =
        oldSuggestedCohort !== newCohort &&
        user &&
        currentCohort !== newCohort &&
        user.cohortVersion !== CURRENT_COHORT_VERSION;

    useEffect(() => {
        if (forceClose) {
            return;
        }

        const userHasHiddenCohortPrompt = isCohortPromptHidden(user);
        if (userHasHiddenCohortPrompt) {
            setOpen(false);
            return;
        }

        if (showSwitchCohorts) {
            setOpen(true);
            return;
        }

        const promptDemotion = shouldPromptDemotion(user);
        if (promptDemotion) {
            setOpen(true);
            return;
        }

        setOpen(false);
    }, [user, forceClose, showSwitchCohorts]);

    const handleHideCohortPrompt = (offsetMillis?: number) => {
        const partialUser = getPartialUserHideCohortPrompt(user, offsetMillis);
        void api.updateUser(partialUser);
        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
        setForceClose(true);
    };

    const handleSwitchCohorts = () => {
        request.onStart();
        api.updateUser({ dojoCohort: newCohort, cohortVersion: CURRENT_COHORT_VERSION })
            .then(() => {
                request.onSuccess();
                handleClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (showSwitchCohorts) {
        return (
            <Dialog open={open} onClose={request.isLoading() ? undefined : handleClose}>
                <DialogTitle>New Cohorts Released</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        The Dojo has recalculated the cohort ranges for all rating systems. As a
                        result, we strongly suggest changing your cohort from{' '}
                        <strong>{currentCohort}</strong> to <strong>{newCohort}</strong>. This will
                        place you with sparring partners more similar in strength and give you
                        training material better suited to your level.
                        <br />
                        You can find more information in the FAQs on our{' '}
                        <Link href='/help' target='_blank'>
                            help page
                        </Link>
                        .
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button loading={request.isLoading()} onClick={handleSwitchCohorts}>
                        Switch Cohorts
                    </Button>
                    <Button
                        disabled={request.isLoading()}
                        onClick={() => handleHideCohortPrompt(ONE_WEEK_MS)}
                    >
                        Hide for 1 week
                    </Button>
                </DialogActions>

                <RequestSnackbar request={request} />
            </Dialog>
        );
    }

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
                        <Button
                            color='inherit'
                            size='small'
                            onClick={() => handleHideCohortPrompt()}
                        >
                            Hide for 1 month
                        </Button>
                        <Button
                            color='inherit'
                            size='small'
                            onClick={handleSwitchCohorts}
                            loading={request.isLoading()}
                            sx={{ ml: 2, px: 3 }}
                            endIcon={<NavigateNextIcon />}
                        >
                            Switch Cohorts
                        </Button>
                    </Stack>
                }
                sx={{ width: 1 }}
            >
                Your rating has been less than your cohort's minimum rating for 90 days. We
                recommend moving down to the {newCohort} cohort.
            </Alert>
        </Snackbar>
    );
}
