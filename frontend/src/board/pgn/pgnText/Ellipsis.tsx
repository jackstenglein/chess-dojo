import { useReconcile } from '@/board/Board';
import { Button, Grid, Typography } from '@mui/material';
import { useChess } from '../PgnBoard';
import { scalePgnRem } from '../boardTools/underboard/settings/viewerSettingsConstants';

export const Ellipsis = ({ ply, firstMove }: { ply: number; firstMove?: boolean }) => {
    const { chess } = useChess();
    const reconcile = useReconcile();

    const onClick = firstMove
        ? () => {
              chess?.seek(null);
              reconcile();
          }
        : undefined;

    return (
        <Grid key={`ellipsis-${ply}`} size={5}>
            {firstMove ? (
                <Button
                    sx={{
                        textTransform: 'none',
                        fontSize: scalePgnRem(0.875),
                        pl: 1,
                        borderRadius: 0,
                        justifyContent: 'start',
                        height: 1,
                        width: 1,
                        color: 'text.secondary',
                    }}
                    onClick={onClick}
                >
                    ...
                </Button>
            ) : (
                <Typography
                    sx={{
                        color: 'text.secondary',
                        fontSize: scalePgnRem(1),
                        pl: 1,
                    }}
                >
                    ...
                </Typography>
            )}
        </Grid>
    );
};
