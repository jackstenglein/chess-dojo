import { metaInitiateCheckout } from '@/analytics/meta';
import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { Course, CoursePurchaseOption } from '@/database/course';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { displayPrice } from '../../../../(list)/CourseListItem';

interface PurchaseOptionProps {
    course: Course;
    purchaseOption: CoursePurchaseOption;
    preview?: boolean;
}

const PurchaseOption: React.FC<PurchaseOptionProps> = ({ course, purchaseOption, preview }) => {
    const api = useApi();
    const request = useRequest();
    const t = useTranslations('courses.purchaseOption');

    const { name, fullPrice, currentPrice, sellingPoints } = purchaseOption;
    const percentOff = Math.round(((fullPrice - currentPrice) / fullPrice) * 100);

    const onBuy = () => {
        if (preview) {
            return;
        }

        request.onStart();
        metaInitiateCheckout([course.id], 'USD', currentPrice);
        api.purchaseCourse(course.type, course.id, purchaseOption.name)
            .then((resp) => {
                window.location.href = resp.data.url;
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack
                    spacing={3}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Stack
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant='subtitle1'
                            sx={{
                                fontWeight: 'bold',
                                color: 'text.secondary',
                            }}
                        >
                            {name || course.name}
                        </Typography>

                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{
                                alignItems: 'baseline',
                            }}
                        >
                            <Typography
                                variant='h6'
                                sx={{
                                    color: currentPrice > 0 ? 'error.main' : undefined,
                                    textDecoration: currentPrice > 0 ? 'line-through' : undefined,
                                }}
                            >
                                ${displayPrice(fullPrice / 100)}
                            </Typography>

                            {currentPrice > 0 && (
                                <>
                                    <Typography
                                        variant='h6'
                                        sx={{
                                            color: 'success.main',
                                        }}
                                    >
                                        ${displayPrice(currentPrice / 100)}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        (-{percentOff}%)
                                    </Typography>
                                </>
                            )}
                        </Stack>
                    </Stack>

                    {sellingPoints && (
                        <Stack spacing={1}>
                            {sellingPoints.map((sp) => (
                                <Stack key={sp.description} direction='row' spacing={1}>
                                    {sp.included ? (
                                        <CheckCircleIcon color='success' />
                                    ) : (
                                        <CancelIcon color='error' />
                                    )}
                                    <Typography>{sp.description}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    )}

                    <Button
                        variant='contained'
                        onClick={onBuy}
                        loading={request.isLoading()}
                        color='success'
                        startIcon={<RocketLaunchIcon />}
                        fullWidth
                    >
                        {t('buy')}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PurchaseOption;
