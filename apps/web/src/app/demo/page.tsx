import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { DemoConsole } from "@/features/demo/demo-console";

export const metadata: Metadata = { title: "Simulation Demo" };

export default function DemoPage() {
  return (
    <PageShell action={false} eyebrow="Buyer console" title="Inspect the lifecycle before anything goes live." intro="Compare bounded quotes, follow distinct payment and proof states, and see where deterministic policy stops the agent.">
      <DemoConsole />
    </PageShell>
  );
}
