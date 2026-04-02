import { describe, expect, it } from "@rstest/core";

describe("broken", () => {
  it("fails with assertion error", () => {
    expect(1).toBe(2);
  });

  it("fails with runtime error", () => {
    const obj = null as unknown as { property: string };
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    obj.property;
  });
});
