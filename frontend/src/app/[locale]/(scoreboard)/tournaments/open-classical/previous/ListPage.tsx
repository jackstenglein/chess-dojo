'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import { OpenClassical } from '@/database/tournament';
import LoadingPage from '@/loading/LoadingPage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    Container,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

const ListPage = () => {
    const api = useApi();
    const request = useRequest<OpenClassical[]>();
    const t = useTranslations('tournaments.openClassical.previous');

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.listPreviousOpenClassicals()
                .then((openClassicals) => {
                    request.onSuccess(openClassicals);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, request]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container sx={{ py: 5 }} maxWidth='md'>
            <RequestSnackbar request={request} />
            <Typography variant='h4' gutterBottom textAlign='center'>
                {t('heading')}
            </Typography>

            <Stack spacing={3} mt={4}>
                <Card
                    sx={{
                        border: '2px solid #F7941F',
                        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <CardActionArea href='/tournaments/open-classical' component={Link}>
                        <CardContent
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                            }}
                        >
                            <Typography variant='h6' component='div'>
                                {t('currentTournament')}
                            </Typography>
                            <Box display='flex' alignItems='center' mt={1}>
                                <AccessTimeIcon
                                    fontSize='small'
                                    sx={{ mr: 1, color: 'text.secondary' }}
                                />
                                <Typography variant='body2' color='text.secondary'>
                                    {t('ongoingNow')}
                                </Typography>
                            </Box>
                        </CardContent>
                    </CardActionArea>
                </Card>

                {request.data?.map((openClassical) => (
                    <Card key={openClassical.startsAt}>
                        <CardActionArea
                            href={`/tournaments/open-classical?tournament=${openClassical.startsAt}`}
                            component={Link}
                        >
                            <CardContent
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant='h6' component='div'>
                                    {openClassical.name}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Stack>
        </Container>
    );
};

export default ListPage;
