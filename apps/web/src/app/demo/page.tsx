import { redirect } from "next/navigation";
export default async function DemoRedirect({ searchParams }: { searchParams: Promise<{ product?: string }> }) { const product = (await searchParams).product; redirect(product ? `/app/orders/new?product=${encodeURIComponent(product)}` : "/app/orders/new"); }
