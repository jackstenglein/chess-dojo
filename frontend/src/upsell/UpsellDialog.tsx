import { EventType, trackEvent } from '@/analytics/events';
import { Link } from '@/components/navigation/Link';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

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
    title = 'Upgrade to a Full Account',
    description = "You're currently on the free plan. Subscribe to the full training plan to:",
    postscript = 'Your progress on the free plan will be carried over when you subscribe.',
    bulletPoints = defaultBulletPoints,
    currentAction,
}) => {
    const pathname = usePathname();

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
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{description}</DialogContentText>
                <DialogContentText component='div'>
                    <ul>
                        {bulletPoints.slice(0, 6).map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                        <li>And more!</li>
                    </ul>
                </DialogContentText>
                <DialogContentText>{postscript}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancel</Button>
                <Button component={Link} href={`/prices?redirect=${pathname}`}>
                    View Options
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UpsellDialog;
