import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

let pathname = "/app/marketplace";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("AppShell", () => {
  beforeEach(() => { pathname = "/app/marketplace"; });

  it("renders product navigation and the execution profile", () => {
    render(<AppShell><h1>Catalog</h1></AppShell>);
    const nav = screen.getByRole("navigation", { name: "Product navigation" });
    for (const label of ["Overview", "Marketplace", "Orders", "Providers", "Sell Data", "Agent Console"]) {
      expect(nav).toHaveTextContent(label);
    }
    expect(screen.getByText("Simulation", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marketplace" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Back to website" })).toHaveAttribute("href", "/");
  });

  it("opens and closes product navigation on mobile", () => {
    render(<AppShell><h1>Catalog</h1></AppShell>);
    const toggle = screen.getByRole("button", { name: "Open product navigation" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("link", { name: "Orders" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
