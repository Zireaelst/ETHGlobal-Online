"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandMark } from "./brand-mark";

const appNav = [
  { label: "Overview", href: "/app", icon: "◫" },
  { label: "Marketplace", href: "/app/marketplace", icon: "⌘" },
  { label: "Orders", href: "/app/orders", icon: "↗" },
  { label: "Providers", href: "/app/providers", icon: "◎" },
  { label: "Sell Data", href: "/app/sell", icon: "+" },
  { label: "Agent Console", href: "/app/agent-console", icon: "◇" },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame">
      <header className="app-mobile-header">
        <Link className="wordmark" href="/app"><BrandMark /><span>BlockTerms</span></Link>
        <button aria-controls="product-navigation" aria-expanded={open} aria-label={open ? "Close product navigation" : "Open product navigation"} className="app-menu-toggle" onClick={() => setOpen((value) => !value)} type="button"><span /><span /></button>
      </header>
      <aside className={`app-sidebar${open ? " is-open" : ""}`} id="product-navigation">
        <Link className="app-brand" href="/app" onClick={() => setOpen(false)}><BrandMark /><span><strong>BlockTerms</strong><small>Data exchange</small></span></Link>
        <div className="environment-card"><span className="status-dot" aria-hidden="true" /><span><small>Execution profile</small><strong>Simulation</strong></span></div>
        <nav aria-label="Product navigation">
          {appNav.map((item) => {
            const current = isCurrent(pathname, item.href);
            return <Link aria-current={current ? "page" : undefined} href={item.href} key={item.href} onClick={() => setOpen(false)}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        <div className="app-sidebar-footer">
          <p><span>Hedera</span><strong>Adapter ready</strong></p>
          <p><span>The Graph</span><strong>2 deployments</strong></p>
          <Link aria-label="Back to website" href="/">← Back to website</Link>
        </div>
      </aside>
      {open ? <button aria-label="Close product navigation" className="app-scrim" onClick={() => setOpen(false)} type="button" /> : null}
      <main className="app-main">{children}</main>
    </div>
  );
}
