import { Height } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { grey } from '@mui/material/colors';
import { useTranslations } from 'next-intl';
import { forwardRef } from 'react';

interface ResizeHandleProps {
    dark?: boolean;
    position?: 'absolute';
    right?: number;
    bottom?: number;
    fontSize?: string;
    visibility?: 'hidden';
    handleAxis?: string;
}

const ResizeHandle = forwardRef<HTMLSpanElement, ResizeHandleProps>((props, ref) => {
    const { dark, position, right, bottom, fontSize, visibility, handleAxis, ...others } = props;
    const t = useTranslations('analysisBoard.chrome');
    return (
        <span
            ref={ref}
            style={{
                position: position || 'relative',
                cursor: 'nwse-resize',
                right: 0,
                visibility,
            }}
            {...others}
        >
            <Tooltip title={t('resizeHandleTooltip')}>
                <Height
                    sx={{
                        position: 'absolute',
                        bottom: bottom || 0,
                        right: right || -2,
                        transform: 'rotate(-45deg)',
                        color: dark ? grey[700] : 'text.secondary',
                        fontSize: fontSize || '1.25rem',
                    }}
                />
            </Tooltip>
        </span>
    );
});
ResizeHandle.displayName = 'ResizeHandle';

export default ResizeHandle;
