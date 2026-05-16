import { EventType, trackEvent } from '@/analytics/events';
import { Link } from '@/components/navigation/Link';
import { usePathname } from '@/i18n/navigation';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

export enum RestrictedAction {
    AccessAllTasks = 'Access all training plan tasks for all cohorts (0-2500)',
    AccessOpenings = 'Access all opening courses',
    AddCalendarEvents = 'Add events to the Dojo Calendar',
    SubmitGames = 'View the full Dojo Database and publish your games',
    JoinScoreboard = 'Get added to the Dojo Scoreboard',
    Graduate = 'Graduate and get featured in the graduation shows on Twitch',
    DownloadDatabase = 'Download the full Dojo Database',
    SearchDatabase = 'Search the Dojo Database by player',
    DatabaseExplorer = 'Search the Dojo Database by position',
    CreateClubs = 'Create new clubs',
    JoinSubscriberClubs = 'Join clubs restricted to subscribers',
    SubscriberChat = 'Access the subscriber-only chat',
    TacticsExams = 'Take all tactics exams',
    ViewGroupClassRecording = 'Access recordings of live group classes',
    ViewGameAndProfileReviewRecording = 'Access Game & Profile Review class recordings',
}

const defaultBulletPoints = [
    RestrictedAction.AccessAllTasks,
    RestrictedAction.AccessOpenings,
    RestrictedAction.AddCalendarEvents,
    RestrictedAction.SubmitGames,
    RestrictedAction.JoinScoreboard,
    RestrictedAction.Graduate,
];

export interface UpsellDialogProps {
    open: boolean;
    onClose: (value: boolean) => void;
    title?: string;
    description?: string;
    postscript?: string;
    bulletPoints?: string[];
    currentAction?: string;
}

const UpsellDialog: React.FC<UpsellDialogProps> = ({
    open,
    onClose,
    title,
    description,
    postscript,
    bulletPoints = defaultBulletPoints,
    currentAction,
}) => {
    const t = useTranslations('upsell.dialog');
    const pathname = usePathname();

    const restrictedActionLabels = useMemo<Record<string, string>>(
        () => ({
            [RestrictedAction.AccessAllTasks]: t('restrictedActionAccessAllTasks'),
            [RestrictedAction.AccessOpenings]: t('restrictedActionAccessOpenings'),
            [RestrictedAction.AddCalendarEvents]: t('restrictedActionAddCalendarEvents'),
            [RestrictedAction.SubmitGames]: t('restrictedActionSubmitGames'),
            [RestrictedAction.JoinScoreboard]: t('restrictedActionJoinScoreboard'),
            [RestrictedAction.Graduate]: t('restrictedActionGraduate'),
            [RestrictedAction.DownloadDatabase]: t('restrictedActionDownloadDatabase'),
            [RestrictedAction.SearchDatabase]: t('restrictedActionSearchDatabase'),
            [RestrictedAction.DatabaseExplorer]: t('restrictedActionDatabaseExplorer'),
            [RestrictedAction.CreateClubs]: t('restrictedActionCreateClubs'),
            [RestrictedAction.JoinSubscriberClubs]: t('restrictedActionJoinSubscriberClubs'),
            [RestrictedAction.SubscriberChat]: t('restrictedActionSubscriberChat'),
            [RestrictedAction.TacticsExams]: t('restrictedActionTacticsExams'),
            [RestrictedAction.ViewGroupClassRecording]: t(
                'restrictedActionViewGroupClassRecording',
            ),
            [RestrictedAction.ViewGameAndProfileReviewRecording]: t(
                'restrictedActionViewGameAndProfileReviewRecording',
            ),
        }),
        [t],
    );

    const displayTitle = title ?? t('defaultTitle');
    const displayDescription = description ?? t('defaultDescription');
    const displayPostscript = postscript ?? t('defaultPostscript');

    useEffect(() => {
        if (open) {
            trackEvent(EventType.ViewUpsellDialog, { current_action: currentAction });
        }
    }, [open, currentAction]);

    if (currentAction) {
        bulletPoints = [currentAction, ...bulletPoints.filter((bp) => bp !== currentAction)];
    }

    return (
        <Dialog
            data-testid='upsell-dialog'
            maxWidth='sm'
            fullWidth
            open={open}
            onClose={() => onClose(false)}
        >
            <DialogTitle>{displayTitle}</DialogTitle>
            <DialogContent>
                <DialogContentText>{displayDescription}</DialogContentText>
                <DialogContentText component='div'>
                    <ul>
                        {bulletPoints.slice(0, 6).map((item) => (
                            <li key={item}>{restrictedActionLabels[item] ?? item}</li>
                        ))}
                        <li>{t('andMore')}</li>
                    </ul>
                </DialogContentText>
                <DialogContentText>{displayPostscript}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>{t('cancel')}</Button>
                <Button component={Link} href={`/prices?redirect=${pathname}`}>
                    {t('viewOptions')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UpsellDialog;
