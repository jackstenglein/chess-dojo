import { EditBlogPage } from './EditBlogPage';

export default async function Page({ params }: { params: Promise<{ id: string[] }> }) {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    return <EditBlogPage id={id} />;
}
