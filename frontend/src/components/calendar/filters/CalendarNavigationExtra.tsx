import CalendarSettingsMenu from './CalendarSettingsMenu';
import CalendarShareMenu from './CalendarShareMenu';

/** Icons rendered in the scheduler navigation bar (share + settings). */
export default function CalendarNavigationExtra() {
    return (
        <>
            <CalendarSettingsMenu />
            <CalendarShareMenu />
        </>
    );
}
