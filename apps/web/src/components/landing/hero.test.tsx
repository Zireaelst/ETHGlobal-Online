import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";
import { ProofScope } from "../proof-scope";

describe("Hero", () => {
  it("uses approved copy, real routes, and capability statements", () => {
    const { container } = render(<Hero />);
    expect(screen.getByRole("heading", { name: "Pay AI agents for data they can verify." })).toBeInTheDocument();
    expect(screen.getByText(/Purchase live blockchain data through x402/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore marketplace" })).toHaveAttribute("href", "/app/marketplace");
    expect(screen.getByRole("link", { name: "Connect an agent" })).toHaveAttribute("href", "/app/agent-console");
    for (const text of ["Live standardized data", "Machine-paid through x402", "Warranty backed by collateral"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(container).not.toHaveTextContent(/customers|queries|success rate|Vesper/i);
    expect(container).toHaveTextContent("Human + agent marketplace");
  });
});

describe("ProofScope", () => {
  it("states the bounded proof and its explicit exclusions", () => {
    render(<ProofScope />);
    expect(screen.getByText(/selected storage fields/i)).toBeInTheDocument();
    expect(screen.getByText(/accepted state root/i)).toBeInTheDocument();
    expect(screen.getByText(/full-query completeness/i)).toBeInTheDocument();
    expect(screen.getByText(/APY/i)).toBeInTheDocument();
    expect(screen.getByText(/TVL/i)).toBeInTheDocument();
    expect(screen.getByText(/financial safety/i)).toBeInTheDocument();
  });
});
