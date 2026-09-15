import { listGraduationsByDate } from '@/api/graduationApi';
import GraduationLinkCardGrid from '@/components/graduations/GraduationLinkCardGrid';

export default async function Page() {
    const graduations = await listGraduationsByDate();

    return <GraduationLinkCardGrid graduations={graduations} />;
}
