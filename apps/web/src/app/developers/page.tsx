import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Developers" };

export default function DevelopersPage() {
  return (
    <PageShell eyebrow="Developers" title="Deterministic policy around untrusted data." intro="Typed order states let a buyer agent propose a purchase while ordinary code keeps control of budgets, deadlines, proof checks and money movement.">
      <section className="feature-grid">
        <article><span className="index">AST</span><h2>Allowlisted requests</h2><p>Models may propose supported scopes. Validation rejects unknown chains, deployments, fields and unsafe freshness bounds.</p></article>
        <article><span className="index">FSM</span><h2>Auditable transitions</h2><p>Quoted, reserved, payment-pending, paid and terminal states move through an exhaustive reducer.</p></article>
        <article><span className="index">EVD</span><h2>Evidence modes</h2><p>Simulation and checked live artifacts stay separate in code, interfaces and exported records.</p></article>
      </section>
    </PageShell>
  );
}
