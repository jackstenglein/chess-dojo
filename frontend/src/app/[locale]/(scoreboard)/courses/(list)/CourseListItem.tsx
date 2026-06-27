import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import { Course, CoursePurchaseOption } from '@/database/course';
import { RequirementCategory } from '@/database/requirement';
import { getCohortRange } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import { CategoryColors } from '@/style/ThemeProvider';
import { useTranslatedCourse } from '@/translation/useTranslatedCourse';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import React from 'react';
import { CourseFilters } from './CourseFilters';

function CourseThumbnail({ course, categoryColor }: { course: Course; categoryColor: string }) {
    if (course.imageUrl) {
        return (
            <Box
                sx={{
                    position: 'relative',
                    width: 1,
                    aspectRatio: '16 / 9',
                    flexShrink: 0,
                    overflow: 'hidden',
                    bgcolor: (theme) =>
                        categoryColor.startsWith('#')
                            ? alpha(categoryColor, 0.12)
                            : theme.palette.action.hover,
                }}
            >
                <img
                    src={course.imageUrl}
                    alt=''
                    style={{ aspectRatio: '16 / 9', width: '100%', objectFit: 'cover' }}
                />
            </Box>
        );
    }

    return null;
}

interface CourseListItemProps {
    course: Course;
    isFreeTier: boolean;
    isPurchased: boolean;
    filters?: CourseFilters;
    preview?: boolean;
}

const CourseListItem: React.FC<CourseListItemProps> = ({
    course: rawCourse,
    isFreeTier,
    isPurchased,
    filters,
    preview,
}) => {
    const course = useTranslatedCourse(rawCourse) ?? rawCourse;
    const t = useTranslations('courses.listItem');
    const api = useApi();
    const request = useRequest();
    const isAccessible = isPurchased || (course.includedWithSubscription && !isFreeTier);
    const router = useRouter();

    if (!preview && filters) {
        if (!filters.categories[course.type]) {
            return null;
        }

        if (filters.showAccessible && !isAccessible) {
            return null;
        }

        const cohortRange = getCohortRange(filters.minCohort, filters.maxCohort);
        if (cohortRange.every((c) => !course.cohorts.includes(c))) {
            return null;
        }
    }

    let purchaseOption: CoursePurchaseOption | null = null;

    for (const option of course.purchaseOptions || []) {
        if (!purchaseOption || option.currentPrice < purchaseOption.currentPrice) {
            purchaseOption = option;
        }
    }

    let percentOff = 0;
    if (purchaseOption && purchaseOption.currentPrice > 0) {
        percentOff = Math.round(
            ((purchaseOption.fullPrice - purchaseOption.currentPrice) / purchaseOption.fullPrice) *
                100,
        );
    }

    const category = course.type[0] + course.type.substring(1).toLowerCase();
    const categoryColor = getCategoryColor(category);

    const onBuy = () => {
        request.onStart();
        api.purchaseCourse(course.type, course.id, purchaseOption?.name, window.location.href)
            .then((resp) => {
                router.push(resp.data.url);
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const actionAreaProps = preview
        ? {}
        : {
              href: `/courses/${course.type}/${course.id}`,
          };

    const renderAccessStatus = () => {
        if (isPurchased) {
            return (
                <Chip
                    size='small'
                    color='success'
                    variant='outlined'
                    icon={<CheckCircleOutlineIcon />}
                    label={t('purchased')}
                />
            );
        }

        if (course.includedWithSubscription && !isFreeTier) {
            return (
                <Chip
                    size='small'
                    color='success'
                    variant='outlined'
                    icon={<CheckCircleOutlineIcon />}
                    label={t('includedWithSubscription')}
                />
            );
        }

        if (purchaseOption) {
            return (
                <Stack direction='row' alignItems='baseline' spacing={1} flexWrap='wrap' useFlexGap>
                    <Typography variant='h6' fontWeight={700} color='text.primary'>
                        ${displayPrice(purchaseOption.currentPrice / 100)}
                    </Typography>

                    {percentOff > 0 && (
                        <>
                            <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ textDecoration: 'line-through' }}
                            >
                                ${displayPrice(purchaseOption.fullPrice / 100)}
                            </Typography>
                            <Chip
                                size='small'
                                label={`${percentOff}% off`}
                                color='error'
                                variant='outlined'
                            />
                        </>
                    )}
                </Stack>
            );
        }

        return (
            <Chip
                size='small'
                variant='outlined'
                icon={<LockOutlinedIcon />}
                label={t('subscriptionRequired')}
            />
        );
    };

    return (
        <Card
            variant='outlined'
            sx={{
                height: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                '&:hover': {
                    boxShadow: 2,
                },
            }}
        >
            <CardActionArea
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                }}
                {...actionAreaProps}
            >
                <CourseThumbnail course={course} categoryColor={categoryColor} />

                <CardContent
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        pt: 2,
                        pb: 1.5,
                        width: 1,
                    }}
                >
                    <Typography
                        variant='h6'
                        component='h3'
                        fontWeight={600}
                        gutterBottom
                        sx={{ lineHeight: 1.3 }}
                    >
                        {course.name}
                    </Typography>

                    <Stack direction='row' alignItems='center' spacing={0.75} mb={1.5}>
                        <PersonOutlineIcon fontSize='small' color='action' />
                        <Typography variant='body2' color='text.secondary'>
                            <Link
                                href={`/profile/${course.owner}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {course.ownerDisplayName}
                            </Link>
                        </Typography>
                    </Stack>

                    <Box mb={2}>{renderAccessStatus()}</Box>

                    <Stack direction='row' flexWrap='wrap' gap={0.75} mb={1.5}>
                        <Chip
                            size='small'
                            label={category}
                            sx={{
                                backgroundColor: categoryColor,
                                color: 'white',
                                fontWeight: 500,
                            }}
                        />
                        <Chip
                            size='small'
                            label={course.cohortRange}
                            variant='outlined'
                            icon={<ShowChartIcon />}
                        />
                        {course.color !== 'None' && (
                            <Chip size='small' label={course.color} variant='outlined' />
                        )}
                    </Stack>

                    <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{
                            flexGrow: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.5,
                        }}
                    >
                        {course.description}
                    </Typography>
                </CardContent>
            </CardActionArea>

            {!isAccessible && purchaseOption && (
                <>
                    <Divider />
                    <CardActions sx={{ p: 2 }}>
                        <Button
                            size='medium'
                            loading={request.isLoading()}
                            onClick={
                                preview
                                    ? undefined
                                    : (e) => {
                                          e.preventDefault();
                                          onBuy();
                                      }
                            }
                            color='success'
                            fullWidth
                            variant='contained'
                            startIcon={<ShoppingCartIcon />}
                        >
                            {t('buy')}
                        </Button>
                        <RequestSnackbar request={request} />
                    </CardActions>
                </>
            )}
        </Card>
    );
};

export function displayPrice(price: number): string {
    if (price % 1 === 0) {
        return `${price}`;
    }
    return price.toFixed(2);
}

export function getCategoryColor(category: string): string {
    switch (category.toLowerCase()) {
        case 'opening':
        case 'openings':
            return CategoryColors[RequirementCategory.Opening];
        case 'middlegame':
        case 'middlegames':
            return CategoryColors[RequirementCategory.Middlegames];
        case 'endgame':
        case 'endgames':
            return CategoryColors[RequirementCategory.Endgame];
        default:
            return 'text.secondary';
    }
}
export default CourseListItem;
