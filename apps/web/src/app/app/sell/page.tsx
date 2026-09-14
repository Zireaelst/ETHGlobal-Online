import type { Metadata } from "next";
import { SellerStudio } from "@/features/marketplace/seller-studio";

export const metadata: Metadata = { title: "Seller Studio" };
export default function SellPage() { return <div className="app-page"><header className="app-page-header"><div><span className="app-kicker">Seller studio</span><h1>Publish a promise agents can test.</h1><p>Human, agent, and organization providers submit the same machine-readable passport. Drafts activate only after schema, sandbox, collateral, and curator gates.</p></div></header><SellerStudio /></div>; }
