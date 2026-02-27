import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { OpenClassicalPutPairingsRequest } from '@/api/tournamentApi';
import { useAuth } from '@/auth/Auth';
import { getRatingRanges, OpenClassical } from '@/database/tournament';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
} from '@mui/material';
import { useState } from 'react';

interface EditorProps {
    openClassical?: OpenClassical;
    onSuccess: (openClassical: OpenClassical) => void;
}

const Editor: React.FC<EditorProps> = ({ openClassical, onSuccess }) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    const maxRound = (Object.values(openClassical?.sections || {})[0]?.rounds?.length || 0) + 1;

    const [region, setRegion] = useState('');
    const [section, setSection] = useState('');
    const [round, setRound] = useState(maxRound);
    const [csvData, setCsvData] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const request = useRequest<OpenClassical>();
    const api = useApi();

    if (!openClassical || !user) {
        return null;
    }
    if (!user.isAdmin && !user.isTournamentAdmin) {
        return null;
    }

    const handleClose = () => {
        setOpen(false);
        setRegion('');
        setSection('');
        setRound(maxRound);
        setCsvData('');
    };

    const onSave = () => {
        const newErrors: Record<string, string> = {};
        const req: OpenClassicalPutPairingsRequest = {};

        if (openClassical.acceptingRegistrations) {
            req.closeRegistrations = true;
        } else {
            req.region = region;
            req.section = section;
            req.round = round;
            req.csvData = csvData;

            if (!region) {
                newErrors.region = 'This field is required';
            }
            if (!section) {
                newErrors.section = 'This field is required';
            }
            if (!round) {
                newErrors.round = 'This field is required';
            }
            if (!csvData.trim()) {
                newErrors.csvData = 'This field is required';
            }
        }

        setErrors(newErrors);
        if (Object.entries(newErrors).length > 0) {
            return;
        }

        request.onStart();
        api.putOpenClassicalPairings(req)
            .then((resp) => {
                request.onSuccess(resp.data);
                onSuccess(resp.data);
                handleClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (openClassical.acceptingRegistrations) {
        return (
            <>
                <Button variant='contained' onClick={() => setOpen(true)}>
                    Edit Pairings
                </Button>
                <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
                    <DialogTitle>Edit Tournament</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Close registrations for the tournament? Pairings will be available to
                            upload after registrations are closed. Note: this cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancel</Button>
                        <LoadingButton loading={request.isLoading()} onClick={onSave}>
                            Close Registrations
                        </LoadingButton>
                    </DialogActions>

                    <RequestSnackbar request={request} />
                </Dialog>
            </>
        );
    }

    return (
        <>
            <Button variant='contained' onClick={() => setOpen(true)}>
                Edit Pairings
            </Button>
            <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
                <DialogTitle>Edit Pairings</DialogTitle>
                <DialogContent>
                    <Stack pt={1} spacing={3}>
                        <TextField
                            data-testid='region'
                            label='Region'
                            select
                            required
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            error={Boolean(errors.region)}
                            helperText={errors.region}
                        >
                            <MenuItem value='A'>Region A (Americas)</MenuItem>
                            <MenuItem value='B'>Region B (Eurasia/Africa/Oceania)</MenuItem>
                        </TextField>

                        <TextField
                            data-testid='section'
                            label='Section'
                            select
                            required
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            error={Boolean(errors.section)}
                            helperText={errors.section}
                        >
                            {getRatingRanges(openClassical).map((rating) => (
                                <MenuItem key={rating} value={rating}>
                                    {rating}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label='Round'
                            fullWidth
                            value={round}
                            onChange={(e) => setRound(parseInt(e.target.value))}
                            error={!!errors.round}
                            helperText={errors.round}
                        >
                            {Array(maxRound)
                                .fill(0)
                                .map((_, i) => (
                                    <MenuItem key={i + 1} value={`${i + 1}`}>
                                        {i + 1}
                                    </MenuItem>
                                ))}
                        </TextField>

                        <TextField
                            label='CSV'
                            multiline
                            minRows={3}
                            maxRows={15}
                            value={csvData}
                            onChange={(e) => setCsvData(e.target.value)}
                            error={!!errors.csvData}
                            helperText={errors.csvData}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <LoadingButton loading={request.isLoading()} onClick={onSave}>
                        Save
                    </LoadingButton>
                </DialogActions>

                <RequestSnackbar request={request} />
            </Dialog>
        </>
    );
};

export default Editor;
