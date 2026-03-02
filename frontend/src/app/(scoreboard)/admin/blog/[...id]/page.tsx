import { EditBlogPage } from './EditBlogPage';

export default async function Page({ params }: PageProps<'/admin/blog/[...id]'>) {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    return <EditBlogPage id={id} />;
}
