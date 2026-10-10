import { Suspense } from 'react';
import { StudyPage } from './StudyPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ taskId: string }> }) {
    const { taskId } = await props.params;
    return (
        <Suspense>
            <StudyPage source={{ kind: 'task', taskId }} />
        </Suspense>
    );
}
