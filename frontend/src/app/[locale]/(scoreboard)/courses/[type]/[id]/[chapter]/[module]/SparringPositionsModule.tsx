import Position from '@/components/profile/trainingPlan/Position';
import { Grid } from '@mui/material';

import { ModuleProps } from './Module';

const SparringPositionsModule: React.FC<ModuleProps> = ({ module }) => {
    if (!module.positions) {
        return null;
    }

    return (
        <Grid container spacing={2} mt={0.5}>
            {module.positions.map((p) => (
                <Grid key={p.fen} size={{ md: 'auto' }}>
                    <Position position={p} orientation={module.boardOrientation} />
                </Grid>
            ))}
        </Grid>
    );
};

export default SparringPositionsModule;
