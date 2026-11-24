'use client';

import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { Alert, Button, Snackbar } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { getStarterTasks, withStarterTask } from './starterProgress';

/** The URL parameter naming the starter task a bot game was started for. */
export const STARTER_TASK_PARAM = 'starterTask';

/**
 * Marks a starter plan task completed when a bot game started from it ends. The bot
 * page renders this with the game's result; it does nothing unless the game was opened
 * from the starter plan (the starterTask parameter). The time from the game's start to
 * its end is saved as the time spent on the task.
 */
export function StarterBotGameTracker({ finished }: { finished: boolean }) {
    const t = useTranslations('profile.trainingPlan.starter.botGame');
    const { searchParams } = useNextSearchParams();
    const taskId = searchParams.get(STARTER_TASK_PARAM);
    const { user, updateUser } = useAuth();
    const api = useApi();
    const startedAt = useRef(0);
    const saved = useRef(false);
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => {
        startedAt.current = Date.now();
    }, []);

    useEffect(() => {
        if (!finished || !taskId || !user || saved.current) {
            return;
        }
        saved.current = true;
        if (getStarterTasks(user.tutorials)[taskId]) {
            // Already completed on the starter plan.
            return;
        }
        const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
        const tutorials = withStarterTask(user.tutorials, taskId, minutes, new Date());
        updateUser({ tutorials });
        api.updateUser({ tutorials })
            .then(() => setShowSaved(true))
            .catch(() => undefined);
    }, [finished, taskId, user, updateUser, api]);

    return (
        <Snackbar
            open={showSaved}
            autoHideDuration={8000}
            onClose={() => setShowSaved(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                severity='success'
                variant='filled'
                onClose={() => setShowSaved(false)}
                action={
                    <Button color='inherit' size='small' component={Link} href='/profile'>
                        {t('backToPlan')}
                    </Button>
                }
            >
                {t('completed')}
            </Alert>
        </Snackbar>
    );
}
