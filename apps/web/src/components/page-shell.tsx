import type { ReactNode } from "react";
import { ButtonLink } from "@blockterms/ui";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({ eyebrow, title, intro, children, action = true }: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  action?: boolean;
}) {
  return (
    <div className="page-surface">
      <SiteHeader />
      <main className="page-main">
        <section className="page-intro">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          {action ? <ButtonLink href="/demo">Open the simulation <span aria-hidden="true">↗</span></ButtonLink> : null}
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
