import { Club } from '@/database/club';
import { ClubFilters, ClubSortMethod } from '@/hooks/useClubFilters';
import {
    FormControl,
    FormControlLabel,
    FormLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';

/**
 * Converts a ClubSortMethod into a user-facing display string.
 * @param sortMethod The sort method to convert.
 * @param t The translations function scoped to `clubs.filters.sortMethods`.
 * @returns A user-facing display string.
 */
function displayClubSortMethod(sortMethod: ClubSortMethod, t: (key: string) => string): string {
    switch (sortMethod) {
        case ClubSortMethod.Alphabetical:
            return t('alphabetical');
        case ClubSortMethod.MemberCount:
            return t('memberCount');
        case ClubSortMethod.CreationDate:
            return t('creationDate');
    }
}

/**
 * Filters the given list of clubs for the ones that match the given set of filters.
 * @param clubs The clubs to filter.
 * @param filters The filters to check.
 * @returns A list of clubs matching the filters.
 */
export function filterClubs(clubs: Club[] | undefined, filters: ClubFilters): Club[] {
    let result = clubs || [];
    const search = filters.search.trim().toLowerCase();
    if (search) {
        result = result.filter(
            (club) =>
                club.name.toLowerCase().includes(search) ||
                club.shortDescription.toLowerCase().includes(search) ||
                club.location.city.toLowerCase().includes(search) ||
                club.location.state.toLowerCase().includes(search) ||
                club.location.country.toLowerCase().includes(search),
        );
    }
    return result.sort((lhs: Club, rhs: Club) => {
        switch (filters.sortMethod) {
            case ClubSortMethod.Alphabetical:
                if (filters.sortDirection === 'asc') {
                    return lhs.name.localeCompare(rhs.name);
                }
                return rhs.name.localeCompare(lhs.name);

            case ClubSortMethod.MemberCount:
                if (filters.sortDirection === 'asc') {
                    return lhs.memberCount - rhs.memberCount;
                }
                return rhs.memberCount - lhs.memberCount;

            case ClubSortMethod.CreationDate:
                if (filters.sortDirection === 'asc') {
                    return lhs.createdAt.localeCompare(rhs.createdAt);
                }
                return rhs.createdAt.localeCompare(lhs.createdAt);
        }
        // Unreachable but satisfies a webpack compiler warning
        return 0;
    });
}

interface ClubFilterEditorProps {
    filters: ClubFilters;
}

export const ClubFilterEditor: React.FC<ClubFilterEditorProps> = ({ filters }) => {
    const t = useTranslations('clubs.filters');
    const tSort = useTranslations('clubs.filters.sortMethods');
    return (
        <Stack
            direction='row'
            spacing={3}
            sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                rowGap: 3,
            }}
        >
            <TextField
                label={t('search')}
                value={filters.search}
                onChange={(e) => filters.setSearch(e.target.value)}
                sx={{ flexGrow: 1 }}
            />

            <Stack
                direction='row'
                spacing={2}
                sx={{
                    alignItems: 'center',
                }}
            >
                <TextField
                    select
                    label={t('sortBy')}
                    value={filters.sortMethod}
                    onChange={(e) => filters.setSortMethod(e.target.value as ClubSortMethod)}
                >
                    {Object.values(ClubSortMethod).map((method) => (
                        <MenuItem key={method} value={method}>
                            {displayClubSortMethod(method, tSort)}
                        </MenuItem>
                    ))}
                </TextField>

                <FormControl>
                    <FormLabel>{t('sortDirection')}</FormLabel>
                    <RadioGroup
                        value={filters.sortDirection}
                        onChange={(e) => filters.setSortDirection(e.target.value as 'asc' | 'desc')}
                        row
                    >
                        <FormControlLabel control={<Radio />} label={t('ascending')} value='asc' />
                        <FormControlLabel
                            control={<Radio />}
                            label={t('descending')}
                            value='desc'
                        />
                    </RadioGroup>
                </FormControl>
            </Stack>
        </Stack>
    );
};
