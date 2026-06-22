import EditGamePage from '@/games/edit/EditGamePage';

export default async function Page(props: { params: Promise<{ cohort: string; id: string }> }) {
    const params = await props.params;

    const { cohort, id } = params;

    return <EditGamePage cohort={cohort} id={id} />;
}
