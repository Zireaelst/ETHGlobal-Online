import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoConsole } from "./demo-console";

describe("DemoConsole", () => {
  it("keeps simulation labeling visible and omits transaction/explorer claims", () => {
    const { container } = render(<DemoConsole />);
    expect(screen.getByText("Simulation")).toBeVisible();
    expect(screen.queryByRole("link", { name: /explorer|transaction/i })).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/transaction hash|live receipt/i);
  });

  it("separates original payment and warranty receipts for invalid delivery", () => {
    render(<DemoConsole />);
    fireEvent.click(screen.getByRole("button", { name: "Invalid proof" }));
    expect(screen.getByText("Original payment receipt")).toBeInTheDocument();
    expect(screen.getByText("Warranty receipt")).toBeInTheDocument();
    expect(screen.getByText(/separate collateral transfer/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment.*reversed/i)).not.toBeInTheDocument();
  });

  it("requires human approval before an over-budget quote can advance", () => {
    render(<DemoConsole />);
    fireEvent.click(screen.getByRole("button", { name: "Over budget" }));
    expect(screen.getByRole("dialog", { name: "Human approval required" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance simulation" })).toBeDisabled();
  });

  it("does not allow a pending settlement to retry before reconciliation", () => {
    render(<DemoConsole />);
    fireEvent.click(screen.getByRole("button", { name: "Settlement pending" }));
    expect(screen.getByRole("button", { name: "Retry payment" })).toBeDisabled();
    expect(screen.getByText(/reconcile the same payment identifier/i)).toBeInTheDocument();
  });

  it("keeps proof exclusions visible in evidence", () => {
    render(<DemoConsole />);
    expect(screen.getByText(/does not prove full-query completeness/i)).toBeInTheDocument();
  });
});
