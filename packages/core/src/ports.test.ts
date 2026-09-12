import { expectTypeOf, it } from "vitest";
import type { GraphAdapter, PaymentAdapter, WitnessAdapter } from "./ports";

it("defines independent execution adapter ports", () => {
  expectTypeOf<GraphAdapter["fetch"]>().toBeFunction();
  expectTypeOf<WitnessAdapter["fetch"]>().toBeFunction();
  expectTypeOf<PaymentAdapter["pay"]>().toBeFunction();
});
