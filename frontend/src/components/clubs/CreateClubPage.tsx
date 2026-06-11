'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import {
    MAX_PROFILE_PICTURE_SIZE_MB,
    encodeFileToBase64,
} from '@/app/(scoreboard)/profile/edit/ProfileEditorPage';
import { ClubDetails } from '@/database/club';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import { ClubAvatar } from '@/profile/Avatar';
import { Delete, Upload } from '@mui/icons-material';
import {
    Button,
    Checkbox,
    Container,
    FormControlLabel,
    FormLabel,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';

export const CreateClubPage = ({ id }: { id: string }) => {
    const api = useApi();
    const getRequest = useRequest<ClubDetails>();
    const saveRequest = useRequest();
    const { setImageBypass } = useCache();

    const [name, setName] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [description, setDescription] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [unlisted, setUnlisted] = useState(false);
    const [approvalRequired, setApprovalRequired] = useState(false);
    const [allowFreeTier, setAllowFreeTier] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [logoUrl, setLogoUrl] = useState<string>();
    const [logoData, setLogoData] = useState<string>();

    const router = useRouter();

    useEffect(() => {
        if (id && !getRequest.isSent()) {
            getRequest.onStart();
            api.getClub(id)
                .then((resp) => {
                    getRequest.onSuccess(resp.data.club);
                    const club = resp.data.club;
                    setName(club.name);
                    setShortDescription(club.shortDescription);
                    setDescription(club.description);
                    setExternalUrl(club.externalUrl);
                    setCity(club.location.city);
                    setState(club.location.state);
                    setCountry(club.location.country);
                    setUnlisted(club.unlisted);
                    setApprovalRequired(club.approvalRequired);
                    setAllowFreeTier(club.allowFreeTier);
                })
                .catch((err) => {
                    getRequest.onFailure(err);
                });
        }
    }, [id, getRequest, api]);

    if (id && (!getRequest.isSent() || getRequest.isLoading())) {
        return <LoadingPage />;
    }

    const onChangePicture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.length) {
            if (files[0].size / 1024 / 1024 > MAX_PROFILE_PICTURE_SIZE_MB) {
                saveRequest.onFailure({ message: 'Logo must be 9MB or smaller' });
                return;
            }

            encodeFileToBase64(files[0])
                .then((encoded) => {
                    setLogoData(encoded);
                    setLogoUrl(URL.createObjectURL(files[0]));
                })
                .catch((err) => {
                    logger.error?.(err);
                    saveRequest.onFailure(err);
                });
        }
    };

    const onDeletePicture = () => {
        setLogoUrl('');
        setLogoData('');
    };

    const onSave = () => {
        const errors: Record<string, string> = {};
        if (name.trim().length === 0) {
            errors.name = 'This field is required';
        }
        if (!unlisted) {
            if (shortDescription.trim().length === 0) {
                errors.shortDescription = 'This field is required';
            } else if (shortDescription.length > 300) {
                errors.shortDescriptionOverride = 'true';
            }
        }
        if (description.trim().length === 0) {
            errors.description = 'This field is required';
        }
        setErrors(errors);
        if (Object.values(errors).length > 0) {
            return;
        }

        const club = {
            name,
            shortDescription,
            description,
            externalUrl,
            location: {
                city,
                state,
                country,
            },
            unlisted,
            approvalRequired,
            allowFreeTier,
            logoData,
        };

        saveRequest.onStart();
        let promise: Promise<AxiosResponse<ClubDetails>>;
        if (id) {
            promise = api.updateClub(id, club);
        } else {
            promise = api.createClub(club);
        }

        promise
            .then((resp) => {
                router.push(`/clubs/${resp.data.id}`);
                if (club.logoData !== undefined) {
                    setImageBypass(Date.now());
                }
            })
            .catch((err) => {
                saveRequest.onFailure(err);
            });
    };

    return (
        <Container sx={{ py: 4 }}>
            <RequestSnackbar request={saveRequest} />
            <Typography variant='h5'>{id ? 'Edit Club' : 'Create New Club'}</Typography>
            <Stack spacing={3} mt={5}>
                <Stack>
                    <FormLabel sx={{ mb: 1 }}>Club Logo</FormLabel>
                    <Stack direction='row' alignItems='center' spacing={3}>
                        <ClubAvatar id={id} name={name} size={150} url={logoUrl} />
                        <Stack spacing={2} alignItems='start'>
                            <Button component='label' variant='outlined' startIcon={<Upload />}>
                                Upload Photo
                                <input
                                    type='file'
                                    accept='image/*'
                                    hidden
                                    onChange={onChangePicture}
                                />
                            </Button>
                            <Button
                                variant='outlined'
                                startIcon={<Delete />}
                                onClick={onDeletePicture}
                            >
                                Delete Photo
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>

                <TextField
                    label='Name'
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                />

                {!unlisted && (
                    <TextField
                        label='Short Description'
                        required
                        multiline
                        minRows={3}
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        error={Boolean(errors.shortDescription) || shortDescription.length > 300}
                        helperText={
                            errors.shortDescription ||
                            `${shortDescription.length}/300 characters. Displayed on the club list page.`
                        }
                    />
                )}

                <TextField
                    label='Full Description'
                    required
                    multiline
                    minRows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    error={Boolean(errors.description)}
                    helperText={
                        errors.description ||
                        "Supports markdown formatting and is displayed on the club's main page"
                    }
                />

                <TextField
                    label='URL'
                    helperText='Add this if you want to link to an external site'
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                />

                <Grid container columnSpacing={2} rowSpacing={3}>
                    <Grid
                        size={{
                            sm: 4,
                        }}
                    >
                        <TextField
                            label='City'
                            fullWidth
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />
                    </Grid>
                    <Grid
                        size={{
                            sm: 4,
                        }}
                    >
                        <TextField
                            label='State'
                            fullWidth
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                        />
                    </Grid>
                    <Grid
                        size={{
                            sm: 4,
                        }}
                    >
                        <TextField
                            label='Country'
                            fullWidth
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Stack spacing={1}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!allowFreeTier}
                                onChange={(_, checked) => setAllowFreeTier(!checked)}
                            />
                        }
                        label='Limit access to subscribers? If checked, free-tier users will not be able to join.'
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={unlisted}
                                onChange={(_, checked) => setUnlisted(checked)}
                            />
                        }
                        label='Unlisted? If checked, this club will not appear in the list and can only be shared by its URL.'
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={approvalRequired}
                                onChange={(_, checked) => setApprovalRequired(checked)}
                            />
                        }
                        label="Require approval to join? If checked, you must manually approve each user's request to join."
                    />
                </Stack>

                <Button
                    variant='contained'
                    onClick={onSave}
                    loading={saveRequest.isLoading()}
                    sx={{ alignSelf: 'center' }}
                >
                    {id ? 'Save' : 'Create Club'}
                </Button>
            </Stack>
        </Container>
    );
};
