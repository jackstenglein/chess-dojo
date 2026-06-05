import { Link } from '@/components/navigation/Link';
import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { ExplorerPositionFollower } from '@jackstenglein/chess-dojo-common/src/explorer/follower';
import { Bookmarks } from '@mui/icons-material';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HelpIcon from '@mui/icons-material/Help';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import copy from 'copy-to-clipboard';
import React, { useState } from 'react';
import { useApi } from '../../../api/Api';
import { RequestSnackbar, useRequest } from '../../../api/Request';
import { useFreeTier } from '../../../auth/Auth';
import { dojoCohorts } from '../../../database/user';
import { masterTimeControlOptions } from './Database';

interface HeaderProps {
    fen: string;
    follower: ExplorerPositionFollower | null | undefined;
    minCohort: string;
    maxCohort: string;
    setFollower: (f: ExplorerPositionFollower | null) => void;
}

const Header: React.FC<HeaderProps> = ({ fen, follower, minCohort, maxCohort, setFollower }) => {
    const isFreeTier = useFreeTier();
    const [copied, setCopied] = useState('');
    const [showFollowDialog, setShowFollowDialog] = useState(false);

    const onCopy = () => {
        copy(fen);
        setCopied('fen');
        setTimeout(() => {
            setCopied('');
        }, 2500);
    };

    return (
        <Stack direction='row' spacing={1} alignItems='center' mb={1}>
            <TextField
                size='small'
                disabled
                value={fen}
                sx={{ flexGrow: 1 }}
                slotProps={{
                    htmlInput: {
                        sx: {
                            fontSize: { xs: '0.8rem', md: 'initial', xl: '0.8rem' },
                        },
                    },
                }}
            />
            <Stack direction='row' alignItems='center'>
                <Tooltip title='Copy FEN'>
                    <IconButton onClick={onCopy}>
                        {copied === 'fen' ? (
                            <CheckIcon sx={{ color: 'text.secondary' }} />
                        ) : (
                            <ContentCopyIcon sx={{ color: 'text.secondary' }} />
                        )}
                    </IconButton>
                </Tooltip>

                {!isFreeTier && (
                    <>
                        <Tooltip
                            title={follower ? 'Edit subscription' : 'Subscribe to this position'}
                        >
                            <IconButton
                                color={follower ? 'success' : 'info'}
                                onClick={() => setShowFollowDialog(!isFreeTier)}
                            >
                                {follower ? <BookmarkAddedIcon /> : <BookmarkAddIcon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='View all subscriptions'>
                            <IconButton
                                component={Link}
                                href='/games/subscriptions'
                                target='_blank'
                            >
                                <Bookmarks sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
            </Stack>

            {showFollowDialog && (
                <FollowDialog
                    fen={fen}
                    follower={follower}
                    open={showFollowDialog}
                    onClose={() => setShowFollowDialog(false)}
                    initialMinCohort={minCohort}
                    initialMaxCohort={maxCohort}
                    setFollower={setFollower}
                />
            )}
        </Stack>
    );
};

interface FollowDialogProps {
    fen: string;
    follower: ExplorerPositionFollower | null | undefined;
    initialMinCohort: string;
    initialMaxCohort: string;
    open: boolean;
    onClose: () => void;
    setFollower: (f: ExplorerPositionFollower | null) => void;
}

export const FollowDialog: React.FC<FollowDialogProps> = ({
    fen,
    follower,
    initialMinCohort,
    initialMaxCohort,
    open,
    onClose,
    setFollower,
}) => {
    const metadata = follower?.followMetadata;
    const [enableDojo, setEnableDojo] = useState(metadata?.dojo.enabled ?? true);
    const [minCohort, setMinCohort] = useState(metadata?.dojo.minCohort ?? initialMinCohort);
    const [maxCohort, setMaxCohort] = useState(metadata?.dojo.maxCohort ?? initialMaxCohort);
    const [disableVariations, setDisableVariations] = useState(
        metadata?.dojo.disableVariations ?? false,
    );
    const [enableMasters, setEnableMasters] = useState(metadata?.masters.enabled ?? true);
    const [timeControls, setTimeControls] = useState(
        metadata?.masters.timeControls ?? masterTimeControlOptions.map((t) => t.value),
    );
    const [avgRating, setAvgRating] = useState(`${metadata?.masters.minAverageRating ?? ''}`);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const api = useApi();
    const request = useRequest();
    const deleteRequest = useRequest();

    const onSubscribe = () => {
        const newErrors: Record<string, string> = {};
        const avgRatingInt = avgRating.trim() ? parseInt(avgRating.trim()) : undefined;
        if (isNaN(avgRatingInt ?? 0)) {
            newErrors.avgRating = 'This must be an integer';
        }
        if (enableMasters && timeControls.length === 0) {
            newErrors.timeControls = 'At least one time control is required if masters is enabled';
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }

        request.onStart();

        api.followPosition({
            fen,
            metadata: {
                dojo: {
                    enabled: enableDojo,
                    minCohort: minCohort || undefined,
                    maxCohort: maxCohort || undefined,
                    disableVariations: disableVariations || undefined,
                },
                masters: {
                    enabled: enableMasters,
                    timeControls,
                    minAverageRating: avgRatingInt,
                },
            },
            unfollow: false,
        })
            .then((resp) => {
                request.onSuccess();
                setFollower(resp.data);
                onClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const onDelete = () => {
        deleteRequest.onStart();

        api.followPosition({
            fen,
            unfollow: true,
        })
            .then((resp) => {
                deleteRequest.onSuccess();
                setFollower(resp.data);
                onClose();
            })
            .catch((err) => {
                deleteRequest.onFailure(err);
            });
    };

    const loading = request.isLoading() || deleteRequest.isLoading();

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth>
            <DialogTitle>
                {follower ? 'Edit Subscription?' : 'Subscribe to this Position?'}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    You will receive a notification whenever a new game is posted containing this
                    position.
                </DialogContentText>

                <Typography variant='h6' sx={{ mt: 3 }}>
                    Dojo Games
                </Typography>
                <Divider sx={{ mb: 1 }} />

                <Grid container columnSpacing={1}>
                    <Grid size={12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={enableDojo}
                                    onChange={(e) => setEnableDojo(e.target.checked)}
                                />
                            }
                            label={
                                <Stack direction='row' spacing={1} alignItems='center'>
                                    <Typography>Enabled</Typography>
                                    <Tooltip title='Uncheck this if you only want to receive notifications for games added to the Masters Database.'>
                                        <HelpIcon
                                            fontSize='small'
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    </Tooltip>
                                </Stack>
                            }
                        />
                    </Grid>

                    <Grid size={12}>
                        <FormControlLabel
                            disabled={!enableDojo}
                            control={
                                <Checkbox
                                    checked={disableVariations}
                                    onChange={(e) => setDisableVariations(e.target.checked)}
                                />
                            }
                            label={
                                <Stack direction='row' spacing={1} alignItems='center'>
                                    <Typography>Ignore variations</Typography>
                                    <Tooltip title="If checked, you will only be notified if the position appears in the game's mainline.">
                                        <HelpIcon
                                            fontSize='small'
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    </Tooltip>
                                </Stack>
                            }
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }} sx={{ mt: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label='Min Cohort (Optional)'
                            value={minCohort}
                            onChange={(e) => setMinCohort(e.target.value)}
                            disabled={!enableDojo}
                        >
                            <MenuItem value=''>None</MenuItem>
                            {dojoCohorts.map((cohort) => (
                                <MenuItem key={cohort} value={cohort}>
                                    {cohort}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }} sx={{ mt: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label='Max Cohort (Optional)'
                            value={maxCohort}
                            onChange={(e) => setMaxCohort(e.target.value)}
                            disabled={!enableDojo}
                        >
                            <MenuItem value=''>None</MenuItem>
                            {dojoCohorts.map((cohort) => (
                                <MenuItem key={cohort} value={cohort}>
                                    {cohort}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Typography variant='h6' sx={{ mt: 3 }}>
                    Masters Games
                </Typography>
                <Divider sx={{ mb: 1 }} />

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={enableMasters}
                            onChange={(e) => setEnableMasters(e.target.checked)}
                        />
                    }
                    label={
                        <Stack direction='row' spacing={1} alignItems='center'>
                            <Typography>Enabled</Typography>
                            <Tooltip title='Uncheck this if you only want to receive notifications for games added to the Dojo Database.'>
                                <HelpIcon fontSize='small' sx={{ color: 'text.secondary' }} />
                            </Tooltip>
                        </Stack>
                    }
                />

                <MultipleSelectChip
                    label='Time Controls'
                    disabled={!enableMasters}
                    selected={timeControls}
                    setSelected={setTimeControls}
                    options={masterTimeControlOptions}
                    sx={{ width: 1, mt: 2 }}
                    error={!!errors.timeControls}
                    helperText={errors.timeControls}
                />

                <TextField
                    fullWidth
                    label='Min Average Rating (Optional)'
                    disabled={!enableMasters}
                    value={avgRating}
                    onChange={(e) => setAvgRating(e.target.value)}
                    sx={{ mt: 3 }}
                    error={!!errors.avgRating}
                    helperText={errors.avgRating}
                />
            </DialogContent>
            <DialogActions>
                <Button disabled={loading} onClick={onClose}>
                    Cancel
                </Button>

                {follower && (
                    <Button
                        loading={deleteRequest.isLoading()}
                        disabled={request.isLoading()}
                        color='error'
                        onClick={onDelete}
                    >
                        Unsubscribe
                    </Button>
                )}

                <Button
                    loading={request.isLoading()}
                    disabled={deleteRequest.isLoading()}
                    onClick={onSubscribe}
                >
                    {follower ? 'Update' : 'Subscribe'}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
            <RequestSnackbar request={deleteRequest} />
        </Dialog>
    );
};

export default Header;
