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
    expect(screen.getByRole("link", { name: /prepare example purchase/i })).toHaveAttribute(
      "href",
      "/demo?product=treasury-decision-bundle",
    );
  });
});
