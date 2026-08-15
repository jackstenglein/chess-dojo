import { Metadata } from 'next';
import BooksPage from './BooksPage';

export const metadata: Metadata = {
    title: 'ChessDojo Recommended Books',
    description: `Our hand-picked recommendations of the most instructive books for each rating range.`,
};

export default function Page() {
    return <BooksPage />;
}
