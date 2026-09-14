import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("keeps product operations out of marketing navigation", () => {
    render(<SiteHeader />);
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(primary).toHaveTextContent("Product");
    expect(primary).toHaveTextContent("Use Cases");
    expect(primary).toHaveTextContent("Developers");
    expect(primary).toHaveTextContent("Docs");
    expect(primary).not.toHaveTextContent("Marketplace");
    expect(primary).not.toHaveTextContent("Providers");
    expect(screen.getAllByRole("link", { name: "Open App" }).length).toBeGreaterThan(0);
  });

  it("closes the mobile menu on Escape and restores toggle focus", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Site navigation" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});
