import { describe, expect, it } from "vitest";
import { nextShoppingQuantity } from "./BoodschapRij";

describe("nextShoppingQuantity", () => {
  it("starts an empty quantity at one when increasing", () => {
    expect(nextShoppingQuantity(undefined, 1)).toBe("1");
  });

  it("increments and decrements a plain numeric quantity", () => {
    expect(nextShoppingQuantity("2", 1)).toBe("3");
    expect(nextShoppingQuantity("2", -1)).toBe("1");
  });

  it("preserves text after a leading number", () => {
    expect(nextShoppingQuantity("1 pak", 1)).toBe("2 pak");
    expect(nextShoppingQuantity("3 pakken", -1)).toBe("2 pakken");
  });

  it("clears the quantity when decrementing to zero", () => {
    expect(nextShoppingQuantity("1", -1)).toBeUndefined();
  });
});
