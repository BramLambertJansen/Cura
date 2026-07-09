import { describe, expect, it } from "vitest";
import { parseShoppingInput } from "./shoppingInput";

describe("parseShoppingInput", () => {
  it("parses a leading bare quantity", () => {
    expect(parseShoppingInput("2 melk")).toEqual({ title: "melk", quantity: "2" });
  });

  it("parses a leading quantity with unit", () => {
    expect(parseShoppingInput("1 pak koffie")).toEqual({ title: "koffie", quantity: "1 pak" });
  });

  it("parses a trailing quantity with unit", () => {
    expect(parseShoppingInput("melk 2 pakken")).toEqual({ title: "melk", quantity: "2 pakken" });
  });

  it("keeps plain input as a title", () => {
    expect(parseShoppingInput("melk")).toEqual({ title: "melk" });
  });

  it("returns undefined for empty input", () => {
    expect(parseShoppingInput("   ")).toBeUndefined();
  });
});
