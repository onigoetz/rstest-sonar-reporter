import { describe, it } from "@rstest/core";

describe("pending", () => {
  it.skip("is skipped", () => {
    // intentionally skipped
  });

  it.todo("is todo");
});
