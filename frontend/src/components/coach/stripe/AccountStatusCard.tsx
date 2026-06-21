import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { StripeAccount } from '@/database/payment';
import { Cancel, CheckCircle, HourglassEmpty } from '@mui/icons-material';
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

function StatusIcon({ status }: { status: boolean | 'active' | 'inactive' | 'pending' }) {
    const t = useTranslations('coach.stripe.accountStatus');
    let title = '';
    let icon = null;
    if (status === true || status === 'active') {
        title = t('statusEnabled');
        icon = <CheckCircle color='success' sx={{ mt: 1 }} />;
    } else if (status === false || status === 'inactive') {
        title = t('statusDisabled');
        icon = <Cancel color='error' sx={{ mt: 1 }} />;
    } else if (status === 'pending') {
        title = t('statusPending');
        icon = <HourglassEmpty sx={{ opacity: 0.8, mt: 1 }} />;
    }

    if (icon === null) {
        return null;
    }

    return (
        <Stack direction='row' spacing={1} justifyContent='center'>
            {icon}
            <Typography>{title}</Typography>
        </Stack>
    );
}

interface AccountStatusCardProps {
    account?: StripeAccount;
}

const AccountStatusCard: React.FC<AccountStatusCardProps> = ({ account }) => {
    const t = useTranslations('coach.stripe.accountStatus');
    const request = useRequest();
    const api = useApi();

    const onSetupAccount = () => {
        request.onStart();
        api.createPaymentAccount()
            .then((resp) => {
                window.location.href = resp.data.url;
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (!account) {
        return null;
    }

    const anyDisabled =
        !account.details_submitted ||
        !account.charges_enabled ||
        !account.payouts_enabled ||
        !account.capabilities.transfers ||
        !account.capabilities.tax_reporting_us_1099_k;

    return (
        <Card variant='outlined'>
            <CardHeader
                title={t('title')}
                action={
                    anyDisabled ? (
                        <Button
                            sx={{ mr: 1 }}
                            variant='contained'
                            loading={request.isLoading()}
                            onClick={onSetupAccount}
                        >
                            {t('updateButton')}
                        </Button>
                    ) : undefined
                }
            />
            <CardContent>
                <Stack spacing={2}>
                    {anyDisabled && (
                        <Stack>
                            <Alert severity='warning'>{t('warning')}</Alert>
                        </Stack>
                    )}

                    <Table size='small'>
                        <TableBody>
                            <TableRow>
                                <TableCell>{t('onboardingComplete')}</TableCell>
                                <TableCell>
                                    <StatusIcon status={account.details_submitted} />
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>{t('chargesEnabled')}</TableCell>
                                <TableCell>
                                    <StatusIcon status={account.charges_enabled} />
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>{t('payoutsEnabled')}</TableCell>
                                <TableCell>
                                    <StatusIcon status={account.payouts_enabled} />
                                </TableCell>
                            </TableRow>

                            <TableRow>
                                <TableCell>{t('taxReportingEnabled')}</TableCell>
                                <TableCell>
                                    <StatusIcon
                                        status={account.capabilities.tax_reporting_us_1099_k}
                                    />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default AccountStatusCard;
