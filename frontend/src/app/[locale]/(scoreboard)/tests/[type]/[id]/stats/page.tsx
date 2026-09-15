import { ExamType } from '@/database/exam';
import { AdminStatsPage } from './AdminStatsPage';

export default async function Page(props: { params: Promise<{ type: ExamType; id: string }> }) {
    const params = await props.params;

    const { type, id } = params;

    return <AdminStatsPage type={type} id={id} />;
}
