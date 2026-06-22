import { listGraduationsByCohort } from '@/api/graduationApi';
import GraduationLinkCardGrid from '@/components/graduations/GraduationLinkCardGrid';

interface PageProps {
    params: Promise<{
        cohort: string;
    }>;
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    const { cohort } = params;

    const graduations = await listGraduationsByCohort(cohort);

    return <GraduationLinkCardGrid graduations={graduations} />;
}
