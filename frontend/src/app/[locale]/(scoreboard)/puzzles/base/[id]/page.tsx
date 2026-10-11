import { PuzzleDetailPage } from '@/components/puzzles/base/PuzzleDetailPage';

/** Renders a single puzzlebase puzzle. */
export default async function PuzzleDetailRoute({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PuzzleDetailPage id={id} />;
}
