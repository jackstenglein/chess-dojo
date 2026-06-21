import { StripeAccount, StripePayoutMethod } from '@/database/payment';
import { AccountBalance, CreditCard, Help } from '@mui/icons-material';
import {
    Card,
    CardContent,
    CardHeader,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

const PayoutsCard = ({ account }: { account?: StripeAccount }) => {
    const t = useTranslations('coach.stripe.payouts');
    if (!account) {
        return null;
    }

    let interval: string = account.settings.payouts.schedule.interval;
    interval = interval.substring(0, 1).toUpperCase() + interval.substring(1);

    return (
        <Card variant='outlined'>
            <CardHeader title={t('title')} />
            <CardContent>
                <Stack spacing={3}>
                    <Stack spacing={1}>
                        <Typography variant='h6'>{t('scheduleTitle')}</Typography>

                        <Table size='small'>
                            <TableBody>
                                <TableRow>
                                    <TableCell>
                                        <Stack direction='row' spacing={1}>
                                            <Typography variant='body2'>
                                                {t('intervalLabel')}
                                            </Typography>
                                            <Tooltip title={t('intervalTooltip')}>
                                                <Help
                                                    sx={{ color: 'text.secondary' }}
                                                    fontSize='small'
                                                />
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align='center'>
                                        <Typography>{interval}</Typography>
                                    </TableCell>
                                </TableRow>

                                <TableRow>
                                    <TableCell>
                                        <Stack direction='row' spacing={1}>
                                            <Typography variant='body2'>
                                                {t('holdingPeriodLabel')}
                                            </Typography>
                                            <Tooltip title={t('holdingPeriodTooltip')}>
                                                <Help
                                                    sx={{ color: 'text.secondary' }}
                                                    fontSize='small'
                                                />
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align='center'>
                                        <Typography>
                                            {t('holdingPeriodValue', {
                                                days: account.settings.payouts.schedule.delay_days,
                                            })}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Stack>

                    {account.external_accounts.total_count > 0 && (
                        <Stack spacing={1.5}>
                            <Typography variant='h6'>{t('payoutMethodTitle')}</Typography>

                            <Stack direction='row' alignItems='center' spacing={1}>
                                {account.external_accounts.data[0].object ===
                                StripePayoutMethod.BankAccount ? (
                                    <>
                                        <AccountBalance sx={{ color: 'text.secondary' }} />
                                        <Typography>{t('bankAccount')}</Typography>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard sx={{ color: 'text.secondary' }} />
                                        <Typography>{t('debitCard')}</Typography>
                                    </>
                                )}
                            </Stack>
                        </Stack>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PayoutsCard;
