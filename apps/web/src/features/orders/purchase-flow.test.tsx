import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { marketplaceProducts } from "../marketplace/catalog";
import { PurchaseFlow } from "./purchase-flow";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("PurchaseFlow", () => {
  beforeEach(() => { localStorage.clear(); push.mockClear(); });

  it("reviews a pinned quote and completes a clearly labeled simulation purchase", () => {
    const product = marketplaceProducts[0]!;
    render(<PurchaseFlow product={product} />);
    expect(screen.getByText(/No funds, live requests, or chain evidence/i)).toBeVisible();
    expect(screen.getByDisplayValue(product.manifest.sample.digest)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Create quote" }));
    expect(screen.getByRole("heading", { name: "Review locked terms" })).toBeVisible();
    expect(screen.getByText(/v1.0.0/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Purchase in simulation" }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/orders\/sim_/));
  });

  it("requires an access credential for private products", () => {
    const product = marketplaceProducts.find((entry) => entry.manifest.access?.visibility === "credential-gated");
    if (!product) throw new Error("private product fixture missing");
    render(<PurchaseFlow product={product} />);
    expect(screen.getByRole("button", { name: "Create quote" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /credential presentation/i }));
    expect(screen.getByRole("button", { name: "Create quote" })).toBeEnabled();
  });
});
