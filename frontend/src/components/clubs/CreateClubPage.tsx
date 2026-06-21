'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import {
    MAX_PROFILE_PICTURE_SIZE_MB,
    encodeFileToBase64,
} from '@/app/[locale]/(scoreboard)/profile/edit/ProfileEditorPage';
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
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export const CreateClubPage = ({ id }: { id: string }) => {
    const t = useTranslations('clubs.create');
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
                saveRequest.onFailure({ message: t('logoSizeError') });
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
            errors.name = t('requiredError');
        }
        if (!unlisted) {
            if (shortDescription.trim().length === 0) {
                errors.shortDescription = t('requiredError');
            } else if (shortDescription.length > 300) {
                errors.shortDescriptionOverride = 'true';
            }
        }
        if (description.trim().length === 0) {
            errors.description = t('requiredError');
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
            <Typography variant='h5'>{id ? t('editTitle') : t('createTitle')}</Typography>
            <Stack spacing={3} mt={5}>
                <Stack>
                    <FormLabel sx={{ mb: 1 }}>{t('logoLabel')}</FormLabel>
                    <Stack direction='row' alignItems='center' spacing={3}>
                        <ClubAvatar id={id} name={name} size={150} url={logoUrl} />
                        <Stack spacing={2} alignItems='start'>
                            <Button component='label' variant='outlined' startIcon={<Upload />}>
                                {t('uploadPhoto')}
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
                                {t('deletePhoto')}
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>

                <TextField
                    label={t('nameLabel')}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                />

                {!unlisted && (
                    <TextField
                        label={t('shortDescriptionLabel')}
                        required
                        multiline
                        minRows={3}
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        error={Boolean(errors.shortDescription) || shortDescription.length > 300}
                        helperText={
                            errors.shortDescription ||
                            t('shortDescriptionHelper', { count: shortDescription.length })
                        }
                    />
                )}

                <TextField
                    label={t('descriptionLabel')}
                    required
                    multiline
                    minRows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    error={Boolean(errors.description)}
                    helperText={errors.description || t('descriptionHelper')}
                />

                <TextField
                    label={t('urlLabel')}
                    helperText={t('urlHelper')}
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
                            label={t('cityLabel')}
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
                            label={t('stateLabel')}
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
                            label={t('countryLabel')}
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
                        label={t('limitAccessLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={unlisted}
                                onChange={(_, checked) => setUnlisted(checked)}
                            />
                        }
                        label={t('unlistedLabel')}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={approvalRequired}
                                onChange={(_, checked) => setApprovalRequired(checked)}
                            />
                        }
                        label={t('approvalRequiredLabel')}
                    />
                </Stack>

                <Button
                    variant='contained'
                    onClick={onSave}
                    loading={saveRequest.isLoading()}
                    sx={{ alignSelf: 'center' }}
                >
                    {id ? t('saveButton') : t('createButton')}
                </Button>
            </Stack>
        </Container>
    );
};
