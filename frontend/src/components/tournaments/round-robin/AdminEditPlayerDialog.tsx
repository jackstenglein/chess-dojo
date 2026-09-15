import { RequestSnackbar, useRequest } from '@/api/Request';
import { adminUpdateRoundRobinPlayer } from '@/api/roundRobinApi';
import {
    RoundRobin,
    RoundRobinPlayer,
    RoundRobinWaitlist,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface AdminEditPlayerDialogProps {
    open: boolean;
    onClose: () => void;
    cohort: string;
    startsAt: string;
    player: RoundRobinPlayer;
    onUpdate: (tournament: RoundRobin | RoundRobinWaitlist) => void;
}

/**
 * Admin dialog to update a player's identity fields in a round robin.
 */
export function AdminEditPlayerDialog({
    open,
    onClose,
    cohort,
    startsAt,
    player,
    onUpdate,
}: AdminEditPlayerDialogProps) {
    const request = useRequest();
    const t = useTranslations('tournaments.roundRobin.adminEditPlayer');
    const [displayName, setDisplayName] = useState(player.displayName);
    const [lichessUsername, setLichessUsername] = useState(player.lichessUsername);
    const [chesscomUsername, setChesscomUsername] = useState(player.chesscomUsername);
    const [discordUsername, setDiscordUsername] = useState(player.discordUsername);
    const [discordId, setDiscordId] = useState(player.discordId);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async () => {
        const nextErrors: Record<string, string> = {};
        if (!displayName.trim()) {
            nextErrors.displayName = t('errorRequired');
        }
        if (!lichessUsername.trim()) {
            nextErrors.lichessUsername = t('errorRequired');
        }
        if (!chesscomUsername.trim()) {
            nextErrors.chesscomUsername = t('errorRequired');
        }
        if (!discordUsername.trim()) {
            nextErrors.discordUsername = t('errorRequired');
        }
        if (!discordId.trim()) {
            nextErrors.discordId = t('errorRequired');
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        try {
            request.onStart();
            const resp = await adminUpdateRoundRobinPlayer({
                cohort,
                startsAt,
                username: player.username,
                displayName: displayName.trim(),
                lichessUsername: lichessUsername.trim(),
                chesscomUsername: chesscomUsername.trim(),
                discordUsername: discordUsername.trim(),
                discordId: discordId.trim(),
            });
            onUpdate(resp.data);
            request.onSuccess();
            onClose();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const handleClose = () => {
        if (request.isLoading()) {
            return;
        }
        onClose();
        request.reset();
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label={t('labelDisplayName')}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        error={!!errors.displayName}
                        helperText={errors.displayName}
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        fullWidth
                        label={t('labelLichessUsername')}
                        value={lichessUsername}
                        onChange={(e) => setLichessUsername(e.target.value)}
                        error={!!errors.lichessUsername}
                        helperText={errors.lichessUsername}
                        sx={{ mt: 2.5 }}
                    />
                    <TextField
                        fullWidth
                        label={t('labelChesscomUsername')}
                        value={chesscomUsername}
                        onChange={(e) => setChesscomUsername(e.target.value)}
                        error={!!errors.chesscomUsername}
                        helperText={errors.chesscomUsername}
                        sx={{ mt: 2.5 }}
                    />
                    <TextField
                        fullWidth
                        label={t('labelDiscordUsername')}
                        value={discordUsername}
                        onChange={(e) => setDiscordUsername(e.target.value)}
                        error={!!errors.discordUsername}
                        helperText={errors.discordUsername}
                        sx={{ mt: 2.5 }}
                    />
                    <TextField
                        fullWidth
                        label={t('labelDiscordId')}
                        value={discordId}
                        onChange={(e) => setDiscordId(e.target.value)}
                        error={!!errors.discordId}
                        helperText={errors.discordId}
                        sx={{ mt: 2.5 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={handleClose}>
                        {t('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={handleSubmit}>
                        {t('update')}
                    </Button>
                </DialogActions>
            </Dialog>
            <RequestSnackbar request={request} />
        </>
    );
}
