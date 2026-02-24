import { parsePgnDate, toLocalPgnDate } from '@/api/gameApi';
import { BlockBoardKeyboardShortcuts } from '@/board/pgn/PgnBoard';
import { PgnDate } from '@jackstenglein/chess';
import { GridRenderEditCellParams, useGridApiContext } from '@mui/x-data-grid-pro';
import { DatePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { TagRow } from './Tags';

export function EditDateCell(props: GridRenderEditCellParams<TagRow, PgnDate | string>) {
    const { id, value, field } = props;
    const apiRef = useGridApiContext();

    const handleChange = (newValue: DateTime<true> | null) => {
        void apiRef.current.setEditCellValue({
            id,
            field,
            value: toLocalPgnDate(newValue),
        });
    };

    const dateTime = parsePgnDate(isPgnDate(value) ? value.value : value);
    return (
        <DatePicker
            autoFocus
            disableFuture
            value={dateTime}
            onChange={handleChange}
            className={BlockBoardKeyboardShortcuts}
            slotProps={{
                textField: { id: BlockBoardKeyboardShortcuts },
            }}
            sx={{
                width: 1,
                height: 1,
                '& .MuiOutlinedInput-root': { height: 1 },
                '& fieldset': { border: 0 },
            }}
        />
    );
}

function isPgnDate(obj: unknown): obj is PgnDate {
    return (
        typeof obj === 'object' && obj !== null && 'value' in obj && typeof obj.value === 'string'
    );
}
