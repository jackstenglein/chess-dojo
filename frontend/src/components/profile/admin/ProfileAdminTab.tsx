'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import {
    deleteAdminComplimentary,
    getAdminUser,
    putAdminComplimentary,
    type AdminUserResponse,
} from '@/api/userApi';
import { getConfig } from '@/config';
import { User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import {
    PAYMENT_CUSTOMER_ID_OVERRIDE,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { OpenInNew } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';

const config = getConfig();
const { region, usersTable } = config.database;
const { userPoolId } = config.auth;

const LARGE_JSON_KEYS = new Set([
    'progress',
    'ratingHistories',
    'openingProgress',
    'exams',
    'minutesSpent',
    'puzzles',
    'tutorials',
    'customTasks',
    'firebaseTokens',
    'sentMilestoneNotifications',
]);

const PAID_TIER_OPTIONS = [
    SubscriptionTier.Basic,
    SubscriptionTier.Lecture,
    SubscriptionTier.GameReview,
];

/** Renders a JSON tree node. */
function JsonNode({
    name,
    value,
    defaultCollapsed,
}: {
    name: string;
    value: unknown;
    defaultCollapsed: boolean;
}) {
    if (value !== null && typeof value === 'object') {
        const entries = Array.isArray(value)
            ? value.map((item, idx) => ({ key: `[${idx}]`, val: item as unknown }))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
                  key: k,
                  val: v,
              }));

        return (
            <Box sx={{ pl: 1.5, borderLeft: 1, borderColor: 'divider', mb: 0.5 }}>
                <details open={!defaultCollapsed}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <Typography component='span' variant='body2' fontWeight={600}>
                            {name}
                        </Typography>
                    </summary>
                    <Box sx={{ pt: 0.5 }}>
                        {entries.map(({ key, val }, idx) => (
                            <JsonNode
                                key={`${name}-${key}-${idx}`}
                                name={key}
                                value={val}
                                defaultCollapsed={LARGE_JSON_KEYS.has(key)}
                            />
                        ))}
                    </Box>
                </details>
            </Box>
        );
    }

    const display =
        typeof value === 'string'
            ? `"${value}"`
            : value === undefined
              ? 'undefined'
              : JSON.stringify(value);

    return (
        <Stack direction='row' spacing={1} sx={{ pl: 1.5, py: 0.15, flexWrap: 'wrap' }}>
            <Typography variant='body2' color='text.secondary' component='span'>
                {name}:
            </Typography>
            <Typography variant='body2' component='span' sx={{ wordBreak: 'break-word' }}>
                {display}
            </Typography>
        </Stack>
    );
}

function AdminJsonTree({ data }: { data: AdminUserResponse }) {
    const entries = useMemo(
        () => Object.entries(data as unknown as Record<string, unknown>),
        [data],
    );
    return (
        <Box
            sx={{
                maxHeight: 520,
                overflow: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 1,
            }}
        >
            {entries.map(([k, v]) => (
                <JsonNode
                    key={k}
                    name={k}
                    value={v}
                    defaultCollapsed={k === 'user' || LARGE_JSON_KEYS.has(k)}
                />
            ))}
        </Box>
    );
}

export function ProfileAdminTab({
    profileUsername,
    onProfileUserUpdated,
}: {
    profileUsername: string;
    onProfileUserUpdated?: (user: User) => void;
}) {
    const loadRequest = useRequest<AdminUserResponse>();
    const mutateRequest = useRequest<User>();

    const [hidden, setHidden] = useState(true);
    const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.Basic);
    const [expiresLocal, setExpiresLocal] = useState<DateTime | null>(null);

    const fetchAdmin = useCallback(async () => {
        try {
            if (!loadRequest.isSent()) {
                loadRequest.onStart();
                const r = await getAdminUser(profileUsername);
                loadRequest.onSuccess(r.data);
                if (r.data.user.paymentInfo?.customerId === PAYMENT_CUSTOMER_ID_OVERRIDE) {
                    setTier(r.data.user.subscriptionTier ?? SubscriptionTier.Basic);
                    setExpiresLocal(
                        r.data.user.paymentInfo?.expiresAt
                            ? DateTime.fromISO(r.data.user.paymentInfo.expiresAt)
                            : null,
                    );
                }
            }
        } catch (e: unknown) {
            loadRequest.onFailure(e);
        }
    }, [loadRequest, profileUsername]);

    useEffect(() => {
        void fetchAdmin();
    }, [fetchAdmin]);

    const user = loadRequest.data?.user;
    const hints = loadRequest.data?.adminHints;
    const cid = user?.paymentInfo?.customerId ?? '';
    const isOverride = cid === PAYMENT_CUSTOMER_ID_OVERRIDE;
    const stripeUrl = cid.startsWith('cus_')
        ? `https://dashboard.stripe.com/customers/${encodeURIComponent(cid)}`
        : '';

    const onSubmitComplimentary = () => {
        let expiresAt = '';
        if (expiresLocal?.isValid) {
            expiresAt = expiresLocal.toUTC().toISO() ?? '';
        }

        mutateRequest.onStart();
        putAdminComplimentary(profileUsername, {
            subscriptionTier: tier,
            expiresAt: expiresAt || undefined,
        })
            .then((r) => {
                mutateRequest.onSuccess(r.data);
                onProfileUserUpdated?.(r.data);
                if (loadRequest.data) {
                    loadRequest.onSuccess({ ...loadRequest.data, user: r.data });
                }
            })
            .catch((e: unknown) => mutateRequest.onFailure(e));
    };

    const onRemoveComplimentary = () => {
        if (!window.confirm('Remove admin complimentary access for this user?')) {
            return;
        }
        mutateRequest.onStart();
        deleteAdminComplimentary(profileUsername)
            .then((r) => {
                mutateRequest.onSuccess(r.data);
                onProfileUserUpdated?.(r.data);
                if (loadRequest.data) {
                    loadRequest.onSuccess({ ...loadRequest.data, user: r.data });
                }
            })
            .catch((e: unknown) => mutateRequest.onFailure(e));
    };

    if (hidden) {
        return (
            <Stack spacing={2} sx={{ py: 2 }} alignItems='start'>
                <Typography>
                    This page can contain sensitive information (e.g. user subscription tier). Make
                    sure nobody else can see your screen before showing details.
                </Typography>
                <Button variant='contained' onClick={() => setHidden(false)}>
                    Show details
                </Button>
            </Stack>
        );
    }

    if (!loadRequest.isSent() || loadRequest.isLoading()) {
        return <LoadingPage />;
    }

    if (loadRequest.isFailure() || !loadRequest.data || !user) {
        return (
            <Stack spacing={2} sx={{ py: 2 }}>
                <Typography color='error'>Could not load admin profile data.</Typography>
                <RequestSnackbar request={loadRequest} />
            </Stack>
        );
    }

    return (
        <Stack spacing={3} sx={{ py: 1 }}>
            <Box>
                <Typography variant='body2'>
                    Username: <strong>{profileUsername}</strong>
                </Typography>
                <Typography variant='body2'>
                    Subscription Status: <strong>{user.subscriptionStatus}</strong>
                </Typography>
                <Typography variant='body2'>
                    Tier: <strong>{user.subscriptionTier ?? '—'}</strong>
                </Typography>
                <Typography variant='body2'>
                    Billing path: <strong>{hints?.billingPath ?? '—'}</strong>
                </Typography>
                {isOverride && (
                    <Alert severity='info' sx={{ mt: 1 }}>
                        Admin complimentary (OVERRIDE) is active.
                        {user.paymentInfo?.expiresAt
                            ? ` Expires: ${user.paymentInfo.expiresAt}`
                            : ' No expiration set.'}
                    </Alert>
                )}
                {(user.paymentInfo?.overrideGrantedAt || user.paymentInfo?.overrideGrantedBy) && (
                    <Typography variant='body2' sx={{ mt: 1 }}>
                        Granted {user.paymentInfo.overrideGrantedAt ?? '—'} by{' '}
                        <strong>{user.paymentInfo.overrideGrantedBy ?? '—'}</strong>
                    </Typography>
                )}
                {(user.paymentInfo?.overrideUpdatedAt || user.paymentInfo?.overrideUpdatedBy) && (
                    <Typography variant='body2'>
                        Last updated {user.paymentInfo.overrideUpdatedAt ?? '—'} by{' '}
                        <strong>{user.paymentInfo.overrideUpdatedBy ?? '—'}</strong>
                    </Typography>
                )}
                {(user.paymentInfo?.overrideRevokedAt || user.paymentInfo?.overrideRevokedBy) && (
                    <Typography variant='body2' color='text.secondary'>
                        Last revoked {user.paymentInfo.overrideRevokedAt ?? '—'} by{' '}
                        {user.paymentInfo.overrideRevokedBy ?? '—'}
                    </Typography>
                )}
            </Box>

            <Stack direction='row' spacing={2} flexWrap='wrap'>
                <Button
                    variant='outlined'
                    href={`https://${region}.console.aws.amazon.com/dynamodbv2/home?region=${region}#edit-item?itemMode=2&pk=${profileUsername}&table=${usersTable}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    startIcon={<OpenInNew />}
                    sx={{ textTransform: 'none' }}
                >
                    Open in DynamoDB
                </Button>
                <Button
                    variant='outlined'
                    href={`https://${region}.console.aws.amazon.com/cognito/v2/idp/user-pools/${userPoolId}/user-management/users/details/${profileUsername}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    startIcon={<OpenInNew />}
                    sx={{ textTransform: 'none' }}
                >
                    Open in Cognito
                </Button>

                {stripeUrl ? (
                    <Button
                        variant='outlined'
                        href={stripeUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        sx={{ alignSelf: 'start', textTransform: 'none' }}
                        startIcon={<OpenInNew />}
                    >
                        Open in Stripe
                    </Button>
                ) : (
                    <Typography variant='body2' color='text.secondary'>
                        {isOverride
                            ? 'Stripe customer link is unavailable while complimentary access is active.'
                            : 'No Stripe customer id on file.'}
                    </Typography>
                )}
            </Stack>

            <Divider />

            <Box>
                <Typography variant='h6' mb={3}>
                    Complimentary access
                </Typography>
                <Stack spacing={2} maxWidth={480}>
                    <FormControl fullWidth>
                        <InputLabel id='admin-tier-label'>Tier</InputLabel>
                        <Select
                            labelId='admin-tier-label'
                            label='Tier'
                            value={tier}
                            onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                        >
                            {PAID_TIER_OPTIONS.map((t) => (
                                <MenuItem key={t} value={t}>
                                    {t}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <DatePicker
                        label='Expiration (optional)'
                        value={expiresLocal}
                        onChange={(v) => setExpiresLocal(v)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                helperText: 'Leave empty for no expiry until removed.',
                            },
                        }}
                    />

                    <Stack direction='row' spacing={1}>
                        <Button
                            variant='contained'
                            onClick={onSubmitComplimentary}
                            disabled={mutateRequest.isLoading()}
                        >
                            {isOverride ? 'Update access' : 'Grant access'}
                        </Button>
                        <Button
                            variant='outlined'
                            color='error'
                            disabled={!isOverride || mutateRequest.isLoading()}
                            onClick={onRemoveComplimentary}
                        >
                            Remove access
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Typography variant='subtitle1' gutterBottom>
                    Raw JSON (admin response)
                </Typography>
                <AdminJsonTree data={loadRequest.data} />
            </Box>

            <RequestSnackbar request={loadRequest} />
            <RequestSnackbar request={mutateRequest} />
        </Stack>
    );
}
