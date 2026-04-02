import { describe, expect, it } from "@rstest/core";

describe("math", () => {
  it("adds numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("multiplies numbers", () => {
    expect(3 * 4).toBe(12);
  });

  describe("subtraction", () => {
    it("subtracts numbers", () => {
      expect(5 - 3).toBe(2);
    });
  });
});
