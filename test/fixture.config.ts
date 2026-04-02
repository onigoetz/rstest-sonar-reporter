import { defineConfig } from "@rstest/core";
import { SonarReporter } from "../src/index.js";

const outputFile = process.env["SONAR_OUTPUT_FILE"];
if (!outputFile) throw new Error("SONAR_OUTPUT_FILE env var required");

export default defineConfig({
  include: ["test/fixtures/*.test.ts"],
  reporters: ["default", new SonarReporter({ outputFile })],
});
