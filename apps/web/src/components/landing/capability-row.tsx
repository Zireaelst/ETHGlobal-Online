import type { CSSProperties } from "react";

const capabilities = [
  { label: "Live standardized data", icon: <path d="M4 16.5 10 11l4 3 6-7" /> },
  { label: "Machine-paid through x402", icon: <><rect x="4" y="6" width="16" height="12" rx="3" /><path d="M8 12h8" /></> },
  { label: "Warranty backed by collateral", icon: <><path d="M12 3 20 6v5c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></> },
];

export function CapabilityRow() {
  return (
    <ul className="capability-row" aria-label="Core capabilities">
      {capabilities.map((item, index) => (
        <li className="reveal" style={{ "--delay": `${580 + index * 90}ms` } as CSSProperties} key={item.label}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">{item.icon}</svg>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
