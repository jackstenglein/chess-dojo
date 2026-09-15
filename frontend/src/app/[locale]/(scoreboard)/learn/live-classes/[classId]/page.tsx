import { LiveClassRecordingsPage } from './LiveClassRecordingsPage';

interface PageProps {
    params: Promise<{ classId: string }>;
}

export default async function Page({ params }: PageProps) {
    const { classId } = await params;
    return <LiveClassRecordingsPage classSlug={classId} />;
}
