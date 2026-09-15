import { EventType, trackEvent } from '@/analytics/events';
import { icons } from '@/style/Icon';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    Grid,
    Stack,
    SvgIconProps,
    SvgIconTypeMap,
    Typography,
} from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { useTranslations } from 'next-intl';
import { ReactNode, useState, type JSX } from 'react';
import { Link } from '../navigation/Link';

export function TrainingTipsButton() {
    const t = useTranslations('profile.trainingTips');
    const [showDialog, setShowDialog] = useState(false);

    const onOpen = () => {
        trackEvent(EventType.OpenProgramTips);
        setShowDialog(true);
    };

    return (
        <>
            {showDialog && (
                <TrainingTipsDialog closeDialog={() => setShowDialog(false)} open={showDialog} />
            )}
            <Button variant='outlined' color='dojoOrange' size='large' onClick={onOpen}>
                {t('programTips')}
            </Button>
        </>
    );
}

interface TrainingTipsDialogProps {
    open: boolean;
    closeDialog: () => void;
}

export default function TrainingTipsDialog({ open, closeDialog }: TrainingTipsDialogProps) {
    const t = useTranslations('profile.trainingTips');
    return (
        <Dialog maxWidth='md' open={open} onClose={closeDialog} fullWidth>
            <DialogContent>
                <Stack spacing={2}>
                    <Stack
                        sx={{
                            display: 'grid',
                            gridTemplateRows: 'auto 1fr',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2rem',
                        }}
                    >
                        <TrainingTipsCard
                            name={t('playClassicalGames')}
                            href='/tournaments'
                            icon={icons['Classical Game']}
                        >
                            <Box>{t('playClassicalGamesDesc1')}</Box>

                            <Box>{t('playClassicalGamesDesc2')}</Box>
                        </TrainingTipsCard>
                        <TrainingTipsCard
                            name={t('annotateGames')}
                            href='/games/import'
                            icon={icons.Annotations}
                        >
                            {t('annotateGamesDesc')}
                        </TrainingTipsCard>
                        <TrainingTipsCard
                            name={t('tacticsTest')}
                            href='/tests'
                            icon={icons.Tactics}
                        >
                            {t('tacticsTestDesc')}
                        </TrainingTipsCard>
                        <TrainingTipsCard
                            name={t('suggestedTasks')}
                            onClick={() => closeDialog()}
                            icon={icons['Suggested Tasks']}
                        >
                            {t('suggestedTasksDesc')}
                        </TrainingTipsCard>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={closeDialog}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
interface TrainingTipsCardProps {
    name: string;
    children: ReactNode;
    icon:
        | ((props: SvgIconProps) => JSX.Element)
        | (OverridableComponent<SvgIconTypeMap> & { muiName: string });
    onClick?: () => void;
    href?: string;
}

const TrainingTipsCard = ({ name, children, icon, href, onClick }: TrainingTipsCardProps) => {
    const Icon = icon;

    return (
        <Grid
            size={{
                xs: 12,
                sm: 6,
            }}
        >
            <Card sx={{ height: 1 }}>
                <CardActionArea component={Link} href={href} sx={{ height: 1 }} onClick={onClick}>
                    <CardContent>
                        <Stack
                            sx={{
                                height: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <Icon sx={{ fontSize: '4rem', mb: 2 }} color='primary' />
                            <Typography
                                variant='h5'
                                sx={{
                                    mb: 0.5,
                                }}
                            >
                                {name}
                            </Typography>
                            <Typography
                                variant='subtitle1'
                                sx={{
                                    color: 'text.secondary',
                                    lineHeight: '1.3',
                                }}
                            >
                                {children}
                            </Typography>
                        </Stack>
                    </CardContent>
                </CardActionArea>
            </Card>
        </Grid>
    );
};
