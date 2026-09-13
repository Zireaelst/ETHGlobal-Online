import { redirect } from "next/navigation";
export default async function ProductRedirect({ params }: { params: Promise<{ slug: string }> }) { redirect(`/app/marketplace/${(await params).slug}`); }
