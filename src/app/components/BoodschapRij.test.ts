import { describe, expect, it } from "vitest";
import { nextShoppingAmount } from "./BoodschapRij";

describe("nextShoppingAmount", () => {
  it("starts an empty amount at one when increasing", () => {
    expect(nextShoppingAmount(undefined, 1)).toBe(1);
  });

  it("increments and decrements a numeric amount", () => {
    expect(nextShoppingAmount(2, 1)).toBe(3);
    expect(nextShoppingAmount(2, -1)).toBe(1);
  });

  it("clears the amount when decrementing to zero", () => {
    expect(nextShoppingAmount(1, -1)).toBeUndefined();
  });
});
