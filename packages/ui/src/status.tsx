import type { ReactNode } from "react";

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" }) {
  return <span className={`status status--${tone}`}><span aria-hidden="true" className="status__dot" />{children}</span>;
}
