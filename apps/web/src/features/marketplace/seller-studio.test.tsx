import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SellerStudio } from "./seller-studio";

describe("SellerStudio", () => {
  it("explains publication gates and exports a draft without claiming publication", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:draft");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<SellerStudio />);
    expect(screen.getByText(/schema validation/i)).toBeVisible();
    expect(screen.getByText(/sandbox delivery/i)).toBeVisible();
    expect(screen.getByText(/credential.*does not prove/i)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Provider type"), { target: { value: "agent" } });
    fireEvent.change(screen.getByLabelText("Buyer access"), { target: { value: "credential-gated" } });
    expect(screen.getByLabelText("Required credential")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Treasury Snapshot" } });
    fireEvent.click(screen.getByRole("button", { name: "Export draft manifest" }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/draft exported/i)).toBeVisible();
    expect(screen.queryByText(/published successfully/i)).not.toBeInTheDocument();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });
});
