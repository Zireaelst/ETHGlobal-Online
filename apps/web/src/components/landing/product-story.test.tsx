import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductStory } from "./product-story";

describe("ProductStory", () => {
  it("turns the landing into a complete product narrative", () => {
    const { container } = render(<ProductStory />);
    expect(container.querySelector("#product")).toBeInTheDocument();
    expect(container.querySelector("#use-cases")).toBeInTheDocument();
    for (const heading of [
      "Data procurement has too many trust gaps.",
      "One lifecycle, from discovery to recourse.",
      "Built for real data products.",
      "Every interface speaks the same marketplace.",
      "Payments, data, and proof stay accountable.",
    ]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getAllByText(/Simulation catalog/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Open the marketplace/i })).toHaveAttribute("href", "/app/marketplace");
    expect(screen.getByRole("link", { name: /See every connection option/i })).toHaveAttribute("href", "/app/agent-console");
    expect(container).toHaveTextContent("Hedera");
    expect(container).toHaveTextContent("The Graph");
    expect(container).toHaveTextContent("MCP");
  });
});
