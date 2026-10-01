import { PuzzleRushRetryPage } from '@/components/puzzles/rush/PuzzleRushRetryPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: {
    params: Promise<{ createdAt: string; index: string }>;
}) {
    const { createdAt, index } = await props.params;
    return (
        <PuzzleRushRetryPage
            createdAt={decodeURIComponent(createdAt)}
            index={Number.parseInt(index, 10)}
        />
    );
}
