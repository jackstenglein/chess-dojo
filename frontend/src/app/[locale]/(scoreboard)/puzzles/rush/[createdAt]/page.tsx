import { PuzzleRushReviewPage } from '@/components/puzzles/rush/PuzzleRushReviewPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ createdAt: string }> }) {
    const { createdAt } = await props.params;
    return <PuzzleRushReviewPage createdAt={decodeURIComponent(createdAt)} />;
}
