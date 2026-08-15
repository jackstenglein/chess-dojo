import { Suspense } from 'react';
import CalendarPage from './CalendarPage';

export default function Page() {
    return (
        <Suspense>
            <CalendarPage />
        </Suspense>
    );
}
