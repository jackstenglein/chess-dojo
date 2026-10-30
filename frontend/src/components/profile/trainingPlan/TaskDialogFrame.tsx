import { RequirementCategory } from '@/database/requirement';
import { AddCircleOutlined, Close, History, InfoOutlined } from '@mui/icons-material';
import {
    Box,
    DialogActions,
    DialogTitle,
    IconButton,
    Stack,
    SxProps,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { CategoryLabel } from './CategoryLabel';
import { TaskDialogView } from './TaskDialog';

/** The style of a task dialog's main action, the same in every view. */
export const taskDialogPrimaryButtonSx: SxProps<Theme> = {
    borderRadius: 1.5,
    px: 2.5,
    textTransform: 'none',
    fontWeight: 600,
};

/**
 * The top of every task dialog view: the task's category, its name, an optional
 * caption naming the view, and a close button.
 */
export function TaskDialogHeader({
    category,
    title,
    caption,
    onClose,
}: {
    category: RequirementCategory;
    title: string;
    caption?: string;
    onClose: () => void;
}) {
    const t = useTranslations('profile.trainingPlan.common');
    return (
        <DialogTitle sx={{ pr: 7, pb: 1.5 }}>
            <Box sx={{ mb: 0.75 }}>
                <CategoryLabel category={category} />
            </Box>
            <Box
                component='span'
                sx={{ display: 'block', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3 }}
            >
                {title}
            </Box>
            {caption && (
                <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.25 }}>
                    {caption}
                </Typography>
            )}
            <IconButton
                aria-label={t('close')}
                onClick={onClose}
                sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary' }}
            >
                <Close fontSize='small' />
            </IconButton>
        </DialogTitle>
    );
}

/**
 * The bottom of every task dialog view: buttons to switch to the other views on the
 * left (with anything else that belongs there, like the timer), and the view's own
 * actions on the right.
 */
export function TaskDialogFooter({
    view,
    setView,
    disabled,
    extra,
    children,
}: {
    view: TaskDialogView;
    setView?: (view: TaskDialogView) => void;
    disabled?: boolean;
    extra?: ReactNode;
    children: ReactNode;
}) {
    const t = useTranslations('profile.trainingPlan.common');
    const views = [
        {
            view: TaskDialogView.Details,
            label: t('taskDetails'),
            icon: <InfoOutlined fontSize='small' />,
            testId: 'task-dialog-details-button',
        },
        {
            view: TaskDialogView.Progress,
            label: t('updateProgress'),
            icon: <AddCircleOutlined fontSize='small' />,
            testId: 'task-dialog-progress-button',
        },
        {
            view: TaskDialogView.History,
            label: t('showHistory'),
            icon: <History fontSize='small' />,
            testId: 'task-updater-show-history-button',
        },
    ].filter((v) => v.view !== view);

    return (
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, flexWrap: 'wrap' }}>
            <Stack direction='row' sx={{ alignItems: 'center', mr: 'auto', ml: -1 }}>
                {setView &&
                    views.map((v) => (
                        <Tooltip key={v.view} title={v.label}>
                            <IconButton
                                aria-label={v.label}
                                onClick={() => setView(v.view)}
                                disabled={disabled}
                                sx={{ color: 'text.secondary' }}
                                data-testid={v.testId}
                            >
                                {v.icon}
                            </IconButton>
                        </Tooltip>
                    ))}
                {extra}
            </Stack>
            {children}
        </DialogActions>
    );
}
