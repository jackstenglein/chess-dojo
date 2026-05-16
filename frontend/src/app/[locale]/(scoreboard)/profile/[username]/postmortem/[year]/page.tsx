import YearReviewPage from './YearReviewPage';

export function generateStaticParams() {
    return [{ year: '2023' }, { year: '2024' }];
}

export default async function Page(props: { params: Promise<{ username: string; year: string }> }) {
    const params = await props.params;
    return <YearReviewPage {...params} />;
}
