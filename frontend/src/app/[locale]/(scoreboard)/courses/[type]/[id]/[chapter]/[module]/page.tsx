import { Suspense } from 'react';
import { CoursePage } from './CoursePage';

const MAX_CHAPTER = 12;
const MAX_MODULE = 7;

export function generateStaticParams() {
    const params = [];

    for (let chapter = 0; chapter < MAX_CHAPTER; chapter++) {
        for (let mod = 0; mod < MAX_MODULE; mod++) {
            params.push({ chapter: `${chapter}`, module: `${mod}` });
        }
    }

    return params;
}

export default async function Page(props: {
    params: Promise<{ type: string; id: string; chapter: string; module: string }>;
}) {
    const params = await props.params;
    return (
        <Suspense>
            <CoursePage params={params} />
        </Suspense>
    );
}
