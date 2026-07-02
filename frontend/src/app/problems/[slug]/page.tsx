import Problem from './problem'

export default async function Page({params,}: {params: Promise<{ slug: string }>;}) {

    const { slug } = await params;

    return <Problem slug={slug} />;
}