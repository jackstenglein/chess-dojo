import { dojoCohorts } from '@/database/user';
import { ScoreboardPage } from './ScoreboardPage';

export function generateStaticParams() {
    return dojoCohorts
        .map((cohort) => ({ type: cohort }))
        .concat({ type: 'dojo' }, { type: 'following' });
}

export default async function Page(props: { params: Promise<{ type: string }> }) {
    const params = await props.params;

    const { type } = params;

    return <ScoreboardPage type={type} />;
}
