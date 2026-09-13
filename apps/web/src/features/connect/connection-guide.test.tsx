import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectionGuide } from "./connection-guide";

describe("ConnectionGuide", () => {
  it("shows real setup paths for people and agent clients", () => {
    const { container } = render(<ConnectionGuide />);
    for (const client of ["Claude Code", "Codex", "OpenCode", "CLI", "TypeScript SDK", "REST API", "MCP stdio"]) expect(screen.getAllByText(client).length).toBeGreaterThan(0);
    expect(container).toHaveTextContent("claude mcp add");
    expect(container).toHaveTextContent("codex mcp add");
    expect(container).toHaveTextContent("opencode mcp add");
    expect(container).toHaveTextContent("pnpm agent:mcp");
    expect(container).toHaveTextContent("pnpm market:e2e");
    expect(container).toHaveTextContent("search_data_products");
    expect(container).toHaveTextContent("stdio");
    expect(container).toHaveTextContent("Simulation");
    for (const client of ["Claude Code", "Codex", "OpenCode"]) {
      expect(screen.getByRole("img", { name: `${client} logo` })).toBeInTheDocument();
    }
  });

  it("switches interface recipes without pretending to run local processes", () => {
    const { container } = render(<ConnectionGuide />);
    fireEvent.click(screen.getByRole("tab", { name: "REST API" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("curl");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("localhost:8787");
    fireEvent.click(screen.getByRole("tab", { name: "MCP stdio" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("pnpm --filter @blockterms/mcp test");
    expect(container).toHaveTextContent("Commands run in your local terminal");
  });
});
