import { CourseModule, CourseModuleType } from '@/database/course';
import { Stack, Typography } from '@mui/material';
import ExercisesModule from './ExercisesModule';
import ModelGamesModule from './ModelGamesModule';
import PgnViewerModule from './PgnViewerModule';
import SparringPositionsModule from './SparringPositionsModule';
import VideoModule from './VideoModule';

export interface ModuleProps {
    module: CourseModule;
}

const Module: React.FC<ModuleProps> = ({ module }) => {
    let M = null;
    switch (module.type) {
        case CourseModuleType.Video:
            M = <VideoModule module={module} />;
            break;
        case CourseModuleType.PgnViewer:
            M = <PgnViewerModule module={module} />;
            break;
        case CourseModuleType.SparringPositions:
            M = <SparringPositionsModule module={module} />;
            break;
        case CourseModuleType.ModelGames:
            M = <ModelGamesModule module={module} />;
            break;
        case CourseModuleType.Themes:
            M = null;
            break;
        case CourseModuleType.Exercises:
            M = <ExercisesModule module={module} />;
            break;
        default:
            M = null;
    }

    if (M === null) {
        return null;
    }

    return (
        <Stack>
            <Typography variant='h6'>{module.name}</Typography>
            <Typography whiteSpace='break-spaces'>{module.description}</Typography>

            {M}

            {module.postscript && <Typography>{module.postscript}</Typography>}
        </Stack>
    );
};

export default Module;
