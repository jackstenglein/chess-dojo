import { useFreeTier } from '@/auth/Auth';
import { PAGE_SIZE_OPTIONS } from '@/components/ui/pagination';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { TablePagination } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { PaginationPropsOverrides } from '@mui/x-data-grid-pro';
import { useTranslations } from 'next-intl';

interface CustomPaginationProps {
    page: number;
    pageSize: number;
    setPageSize: (size: number) => void;
    count: number;
    hasMore: boolean;
    onPrevPage: () => void;
    onNextPage: () => void;
}

export const CustomPagination: React.FC<CustomPaginationProps & PaginationPropsOverrides> = ({
    page,
    pageSize,
    setPageSize,
    count,
    hasMore,
    onPrevPage,
    onNextPage,
    ...rest
}) => {
    const t = useTranslations('ui.pagination');
    const isFreeTier = useFreeTier();

    return (
        <TablePagination
            {...rest}
            component='div'
            count={count}
            page={page}
            onPageChange={() => null}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value))}
            rowsPerPage={pageSize}
            labelDisplayedRows={({
                from,
                to,
                count,
            }: {
                from: number;
                to: number;
                count: number;
            }) => {
                return hasMore
                    ? t('displayedRowsWithMore', { from, to, count })
                    : t('displayedRowsExact', { from, to, count });
            }}
            slots={{
                actions: {
                    previousButton: () => {
                        return (
                            <IconButton
                                aria-label={t('previousPageLabel')}
                                title={t('previousPageLabel')}
                                onClick={onPrevPage}
                                disabled={page === 0}
                            >
                                <KeyboardArrowLeft />
                            </IconButton>
                        );
                    },
                    nextButton: () => {
                        return (
                            <Tooltip title={isFreeTier ? t('freeTierLimit') : ''}>
                                <span>
                                    <IconButton
                                        aria-label={t('nextPageLabel')}
                                        title={t('nextPageLabel')}
                                        onClick={onNextPage}
                                        disabled={
                                            isFreeTier ||
                                            ((page + 1) * pageSize >= count && !hasMore)
                                        }
                                    >
                                        <KeyboardArrowRight />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        );
                    },
                },
            }}
        />
    );
};
