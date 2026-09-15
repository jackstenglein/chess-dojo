import { EditCoursePage } from '../../EditCoursePage';

export default async function Page(props: { params: Promise<{ type: string; id: string }> }) {
    const { type, id } = await props.params;
    return <EditCoursePage type={type} id={id} />;
}
