import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { marketplaceProducts } from "./catalog";
import { MarketplaceGrid } from "./marketplace-grid";
import { ProductPassport } from "./product-passport";

describe("marketplace experience", () => {
  it("filters example products by product and provider text", () => {
    render(<MarketplaceGrid products={marketplaceProducts} />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Atlas" } });
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.queryByText("Risk Signal Brief")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Inspect product passport/i })[0]).toHaveAttribute("href", "/app/marketplace/same-block-liquidity");
  });

  it("shows proof, warranty, credential, lineage, and example boundaries", () => {
    const bundle = marketplaceProducts.find((product) => product.manifest.kind === "bundle");
    if (!bundle) throw new Error("bundle fixture missing");
    render(<ProductPassport product={bundle} />);
    expect(screen.getByText("Example catalog record")).toBeVisible();
    expect(screen.getByText(/graph-eip1186-v1/i)).toBeVisible();
    expect(screen.getByText(/separate collateral transfer/i)).toBeVisible();
    expect(screen.getByText(/eligibility signal/i)).toBeVisible();
    expect(screen.getByText(/same-block-union/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /buy access/i })).toHaveAttribute(
      "href",
      "/app/orders/new?product=treasury-decision-bundle",
    );
  });

  it("shows buyer credential gates as access conditions rather than correctness claims", () => {
    const gated = marketplaceProducts.find((product) => product.manifest.access?.visibility === "credential-gated");
    if (!gated) throw new Error("credential-gated fixture missing");
    render(<ProductPassport product={gated} />);
    expect(screen.getByText(/credential-gated private data/i)).toBeVisible();
    expect(screen.getByText(/organization.*kyb.example/i)).toBeVisible();
    expect(screen.getByText(/does not prove the purchased data is correct/i)).toBeVisible();
  });
});
