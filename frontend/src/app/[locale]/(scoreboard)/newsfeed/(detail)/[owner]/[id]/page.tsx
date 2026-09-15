import { NewsfeedDetail } from './NewsfeedDetail';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ owner: string; id: string }> }) {
    const params = await props.params;

    const { owner, id } = params;

    return <NewsfeedDetail owner={owner} id={id} />;
}
