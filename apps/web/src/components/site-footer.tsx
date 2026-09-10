import Link from "next/link";
import { siteConfig } from "@/config/site";
import { BrandMark } from "./brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand"><BrandMark /><span>{siteConfig.name}</span></div>
      <p>Verifiable agent data infrastructure with narrow, explicit guarantees.</p>
      <nav aria-label="Footer navigation">
        {[...siteConfig.nav, ...siteConfig.footerNav].map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
      </nav>
      <small>Simulation until live integrations and evidence are independently checked.</small>
    </footer>
  );
}
