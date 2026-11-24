import { RequirementCategory } from '@/database/requirement';
import { categoryTextColor } from '@/style/categoryText';
import { CategoryColors } from '@/style/ThemeProvider';
import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { TrainingPlanIcon } from './TrainingPlanIcon';

/**
 * A task's category as a small label, led by the category's icon from the full
 * training plan.
 */
export function CategoryLabel({ category }: { category: RequirementCategory }) {
    const tCategory = useTranslations('enums.requirementCategory');
    const color = CategoryColors[category];

    return (
        <Box
            sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                ...categoryTextColor(theme, color),
            })}
        >
            <TrainingPlanIcon category={category} sx={{ fontSize: '1rem', color: 'inherit' }} />
            <Typography
                variant='caption'
                sx={{
                    color: 'inherit',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                }}
            >
                {tCategory.has(category) ? tCategory(category) : category}
            </Typography>
        </Box>
    );
}
