import { Suspense } from 'react';
import { StudyPage } from '../../../[taskId]/StudyPage';

export function generateStaticParams() {
    return [];
}

/** A course in the reader without a task, to browse and annotate. Nothing is timed or counted. */
export default async function Page(props: { params: Promise<{ type: string; id: string }> }) {
    const { type, id } = await props.params;
    return (
        <Suspense>
            <StudyPage source={{ kind: 'course', courseType: type, courseId: id }} />
        </Suspense>
    );
}
