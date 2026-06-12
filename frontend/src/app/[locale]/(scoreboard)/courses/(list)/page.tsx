import type { Metadata } from 'next';
import ListCoursesPage from './ListCoursesPage';

export const metadata: Metadata = {
    title: 'ChessDojo Courses',
    description: 'Browse structured chess courses created by the ChessDojo senseis.',
};

export default function Page() {
    return <ListCoursesPage />;
}
