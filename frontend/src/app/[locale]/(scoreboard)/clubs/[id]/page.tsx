import { Suspense } from 'react';
import { ClubDetailsPage } from './ClubDetailsPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const { id } = params;

    return (
        <Suspense>
            <ClubDetailsPage id={id} />
        </Suspense>
    );
}
