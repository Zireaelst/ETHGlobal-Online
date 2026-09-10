import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("renders four primary routes and a demo action", () => {
    render(<SiteHeader />);
    expect(screen.getAllByRole("link", { name: /How It Works|Proofs|Providers|Docs/ })).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: "Launch Demo" }).length).toBeGreaterThan(0);
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
