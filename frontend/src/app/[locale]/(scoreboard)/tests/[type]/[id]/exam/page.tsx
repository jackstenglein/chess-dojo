import { ExamType } from '@/database/exam';
import { ExamPage } from './ExamPage';

export default async function Page(props: { params: Promise<{ type: ExamType; id: string }> }) {
    const params = await props.params;

    const { type, id } = params;

    return <ExamPage type={type} id={id} />;
}
