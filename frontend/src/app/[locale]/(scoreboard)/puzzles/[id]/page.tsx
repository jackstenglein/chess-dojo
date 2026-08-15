import { CheckmatePuzzlePage } from '@/components/puzzles/checkmate/CheckmatePuzzlePage';

export function generateStaticParams() {
    return [];
}

export default async function PuzzleByIdPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    return <CheckmatePuzzlePage id={id} />;
}
