import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
} from '@/components/calendar/filters/CalendarFilters';
import { CourseType, displayCourseType } from '@/database/course';
import { dojoCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    Checkbox,
    FormControlLabel,
    MenuItem,
    Stack,
    TextField,
    Theme,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { getCategoryColor } from './CourseListItem';

export interface CourseFilters {
    /** A map from the category name to whether the category is included. */
    categories: Record<CourseType, boolean>;

    /** A function that sets the new categories. */
    setCategories: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

    /** The minimum cohort the courses apply to, inclusive. */
    minCohort: string;

    /** A function that sets minCohort. */
    setMinCohort: (cohort: string) => void;

    /** The maximum cohort the courses apply to, inclusive. */
    maxCohort: string;

    /** A function that sets maxCohort. */
    setMaxCohort: (cohort: string) => void;

    /** Whether to show only accessible courses. */
    showAccessible: boolean;

    /** A function that sets showAccessible. */
    setShowAccessible: (value: boolean) => void;
}

export function useCourseFilters(): CourseFilters {
    const [categories, setCategories] = useState<Record<CourseType, boolean>>({
        [CourseType.Opening]: true,
        [CourseType.Endgame]: true,
    });
    const [minCohort, setMinCohort] = useState('0-300');
    const [maxCohort, setMaxCohort] = useState('2400+');
    const [showAccessible, setShowAccessible] = useState(false);

    return {
        categories,
        setCategories,
        minCohort,
        setMinCohort,
        maxCohort,
        setMaxCohort,
        showAccessible,
        setShowAccessible,
    };
}

interface CourseFilterEditorProps {
    filters: CourseFilters;
}

export const CourseFilterEditor: React.FC<CourseFilterEditorProps> = ({ filters }) => {
    const [expanded, setExpanded] = useState<string | boolean>(false);
    const forceExpansion = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

    const handleAccordionChange =
        (panel: string) => (_: React.SyntheticEvent, newExpanded: boolean) => {
            if (!forceExpansion) {
                setExpanded(newExpanded ? panel : false);
            }
        };

    const onChangeCategories = (category: string, value: boolean) => {
        filters.setCategories({
            ...filters.categories,
            [category]: value,
        });
    };

    return (
        <Stack data-testid='course-filters' sx={{ pt: 0.5, pb: 2 }} spacing={{ xs: 3, sm: 4 }}>
            <Accordion
                expanded={forceExpansion || expanded === 'categories'}
                onChange={handleAccordionChange('categories')}
            >
                <AccordionSummary forceExpansion={forceExpansion}>
                    <Typography variant='h6' color='text.secondary'>
                        Categories
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack>
                        {Object.values(CourseType).map((category) => (
                            <FormControlLabel
                                key={category}
                                control={
                                    <Checkbox
                                        checked={filters.categories[category]}
                                        onChange={(event) =>
                                            onChangeCategories(category, event.target.checked)
                                        }
                                        color={getCategoryColor(category)}
                                    />
                                }
                                label={displayCourseType(category)}
                            />
                        ))}
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Accordion
                expanded={forceExpansion || expanded === 'cohortRange'}
                onChange={handleAccordionChange('cohortRange')}
            >
                <AccordionSummary forceExpansion={forceExpansion}>
                    <Typography variant='h6' color='text.secondary'>
                        Cohort Range
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={3} mt={2}>
                        <TextField
                            select
                            fullWidth
                            label='Min Cohort'
                            value={filters.minCohort}
                            onChange={(e) => filters.setMinCohort(e.target.value)}
                        >
                            {dojoCohorts.map((cohort) => (
                                <MenuItem key={cohort} value={cohort}>
                                    <CohortIcon
                                        cohort={cohort}
                                        size={40}
                                        sx={{
                                            marginRight: '0.6rem',
                                            verticalAlign: 'middle',
                                        }}
                                        tooltip=''
                                        color='primary'
                                    />

                                    {cohort}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            fullWidth
                            label='Max Cohort'
                            value={filters.maxCohort}
                            onChange={(e) => filters.setMaxCohort(e.target.value)}
                        >
                            {dojoCohorts.map((cohort, i) => (
                                <MenuItem
                                    key={cohort}
                                    value={cohort}
                                    disabled={
                                        Boolean(filters.minCohort) &&
                                        dojoCohorts.indexOf(filters.minCohort) > i
                                    }
                                >
                                    <CohortIcon
                                        cohort={cohort}
                                        size={40}
                                        sx={{
                                            marginRight: '0.6rem',
                                            verticalAlign: 'middle',
                                        }}
                                        tooltip=''
                                        color='primary'
                                    />{' '}
                                    {cohort}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <Accordion
                expanded={forceExpansion || expanded === 'accessibility'}
                onChange={handleAccordionChange('accessibility')}
            >
                <AccordionSummary forceExpansion={forceExpansion}>
                    <Typography variant='h6' color='text.secondary'>
                        Accessibility
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filters.showAccessible}
                                    onChange={(event) =>
                                        filters.setShowAccessible(event.target.checked)
                                    }
                                />
                            }
                            label='Only show courses I have access to'
                        />
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Stack>
    );
};
