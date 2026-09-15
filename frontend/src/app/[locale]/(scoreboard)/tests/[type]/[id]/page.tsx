import { ExamType } from '@/database/exam';
import { ExamInstructionsPage } from './(instructions)/ExamInstructionsPage';

export function generateStaticParams() {
    return [];
}

export default async function Page(props: { params: Promise<{ type: ExamType; id: string }> }) {
    const params = await props.params;

    const { type, id } = params;

    return <ExamInstructionsPage type={type} id={id} />;
}
