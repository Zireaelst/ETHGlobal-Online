import { redirect } from "next/navigation";
export default async function ProviderRedirect({ params }: { params: Promise<{ id: string }> }) { redirect(`/app/providers/${(await params).id}`); }
