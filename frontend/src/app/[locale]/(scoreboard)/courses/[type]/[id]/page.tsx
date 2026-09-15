import { Suspense } from 'react';
import { CoursePage } from './[chapter]/[module]/CoursePage';

export function generateStaticParams() {
    return [
        { type: 'ENDGAME', id: '34241b4d-3a8f-4d5f-9a15-b26cf718a0d0' },
        { type: 'OPENING', id: '0e144cc9-be12-48f2-a3b0-92596fa2559d' },
        { type: 'OPENING', id: '12d020c6-6d03-4b1f-9c01-566bffa3b23b' },
        { type: 'OPENING', id: '2402cb47-d65a-4914-bc11-8f60eb32e41a' },
        { type: 'OPENING', id: '37dd0c09-7622-4e87-b0df-7d3e6b37e410' },
        { type: 'OPENING', id: 'b042a392-e285-4466-9bc0-deeecc2ce16c' },
        { type: 'OPENING', id: 'd30581c8-f2c4-4d1c-8a5e-f303a83cc193' },
    ];
}

export default async function Page(props: { params: Promise<{ type: string; id: string }> }) {
    const params = await props.params;
    return (
        <Suspense>
            <CoursePage params={params} />
        </Suspense>
    );
}
