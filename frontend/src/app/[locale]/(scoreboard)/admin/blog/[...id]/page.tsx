import { EditBlogPage } from './EditBlogPage';

export default async function Page({ params }: PageProps<'/[locale]/admin/blog/[...id]'>) {
    const { id: idSegments } = await params;
    const id = idSegments.join('/');
    return <EditBlogPage id={id} />;
}
