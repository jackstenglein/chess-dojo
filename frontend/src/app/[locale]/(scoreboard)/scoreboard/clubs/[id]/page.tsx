import { ClubScoreboardPage } from './ClubScoreboardPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const { id } = params;

    return <ClubScoreboardPage id={id} />;
}
