import { CreateClubPage } from '@/components/clubs/CreateClubPage';

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const { id } = params;

    return <CreateClubPage id={id} />;
}
