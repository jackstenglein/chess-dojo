import { Course } from '@/database/course';
import { useRouter } from '@/hooks/useRouter';
import { useTranslatedCourse } from '@/translation/useTranslatedCourse';
import UpsellAlert from '@/upsell/UpsellAlert';
import { Alert, Button, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import PurchaseOption from './PurchaseOption';

interface PurchaseCoursePageProps {
    course?: Course;
    preview?: boolean;
    isFreeTier: boolean;
}

const PurchaseCoursePage: React.FC<PurchaseCoursePageProps> = ({
    course: rawCourse,
    preview,
    isFreeTier,
}) => {
    const course = useTranslatedCourse(rawCourse) ?? rawCourse;
    const t = useTranslations('courses.purchase');

    if (!course) {
        return null;
    }

    return (
        <Container maxWidth={false} sx={{ pt: 6, pb: 4 }}>
            <Stack>
                <Typography variant='h4'>{course.name}</Typography>
                <Typography
                    variant='h5'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {course.cohortRange}
                </Typography>
                <Divider />

                <Stack
                    spacing={2}
                    sx={{
                        mt: 2,
                    }}
                >
                    <Grid
                        container
                        rowSpacing={2}
                        columnSpacing={4}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <PurchaseMessage course={course} isFreeTier={isFreeTier} />

                        <Grid
                            size={{
                                xs: 12,
                                sm: 12,
                                md: 6,
                                lg: 6,
                                xl: 4,
                            }}
                        >
                            <Stack spacing={2}>
                                {course.description.split('\n\n').map((p, i) => (
                                    <Typography
                                        key={i}
                                        sx={{
                                            mb: 2,
                                        }}
                                    >
                                        {p}
                                    </Typography>
                                ))}

                                {course.whatsIncluded?.length && (
                                    <Stack>
                                        <Typography>{t('whatsIncluded')}</Typography>
                                        <ul style={{ marginTop: 0 }}>
                                            {course.whatsIncluded.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </Stack>
                                )}
                            </Stack>
                        </Grid>

                        {(!isFreeTier || course.availableForFreeUsers) &&
                            course.purchaseOptions?.map((option) => (
                                <Grid
                                    key={option.name}
                                    size={{
                                        xs: 12,
                                        md: 6,
                                        lg: 4,
                                        xl: 3,
                                    }}
                                >
                                    <PurchaseOption
                                        course={course}
                                        purchaseOption={option}
                                        preview={preview}
                                    />
                                </Grid>
                            ))}
                    </Grid>
                </Stack>
            </Stack>
        </Container>
    );
};

interface PurchaseMessageProps {
    course: Course;
    isFreeTier: boolean;
}

const PurchaseMessage: React.FC<PurchaseMessageProps> = ({ course, isFreeTier }) => {
    const t = useTranslations('courses.purchase');
    const router = useRouter();

    const onViewPrices = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const currentPage = encodeURIComponent(window.location.href);
        router.push(`/prices?redirect=${currentPage}`);
    };

    let content = null;
    if (isFreeTier) {
        if (!course.availableForFreeUsers) {
            content = <UpsellAlert>{t('subscribersOnly')}</UpsellAlert>;
        } else if (course.includedWithSubscription) {
            content = (
                <Alert
                    severity='info'
                    action={
                        <Button color='inherit' href='/prices' size='small' onClick={onViewPrices}>
                            {t('viewPrices')}
                        </Button>
                    }
                >
                    {t('alsoUnlockBySubscribing')}
                </Alert>
            );
        }
    } else {
        content = <Alert severity='info'>{t('soldSeparately')}</Alert>;
    }

    if (!content) {
        return null;
    }

    return (
        <>
            <Grid
                size={{
                    xs: 12,
                    sm: 12,
                    md: 12,
                    lg: 10,
                    xl: 7,
                }}
                sx={{
                    mb: 2,
                }}
            >
                {content}
            </Grid>
            <Grid
                size={{
                    xs: 0,
                    lg: 2,
                    xl: 5,
                }}
            ></Grid>
        </>
    );
};

export default PurchaseCoursePage;
