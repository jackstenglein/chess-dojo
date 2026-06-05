import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useCallback, useMemo } from 'react';
import { EventData, Joyride as ReactJoyride, Step } from 'react-joyride';
import { TutorialName } from './tutorialNames';
import TutorialTooltip from './TutorialTooltip';

interface TutorialProps {
    name: TutorialName;
    steps: Step[];
    zIndex?: number;
}

const Tutorial: React.FC<TutorialProps> = ({ name, steps, zIndex }) => {
    const { searchParams, updateSearchParams } = useNextSearchParams();
    const { user, updateUser } = useAuth();
    const api = useApi();

    const darkMode = !user?.enableLightMode;

    const callback = useCallback(
        (state: EventData) => {
            if (state.status === 'finished' || state.action === 'close') {
                const tutorials = {
                    ...user?.tutorials,
                    [name]: true,
                };
                updateUser({ tutorials });
                void api.updateUser({ tutorials });
                updateSearchParams({ tutorial: '' });
            }
        },
        [api, user?.tutorials, name, updateUser, updateSearchParams],
    );

    const run = (user && !user.tutorials?.[name]) || searchParams.get('tutorial') === 'true';

    const Joyride = useMemo(
        () => (
            <ReactJoyride
                run={run}
                continuous
                steps={steps}
                tooltipComponent={TutorialTooltip}
                onEvent={callback}
                options={{
                    arrowColor: darkMode ? '#1e1e1e' : 'white',
                    zIndex: zIndex || 100,
                    overlayClickAction: false,
                    scrollOffset: 100,
                }}
            />
        ),
        [run, callback, darkMode, steps, zIndex],
    );

    return Joyride;
};

export default Tutorial;
