import { defineConfig } from "@rstest/core";
import { SonarReporter } from "./src/index.js";

export default defineConfig({
  include: ["test/*.test.ts"],
  reporters: ["default", new SonarReporter({ outputFile: "./coverage/sonar-report.xml" })],
  coverage: {
    reporters: ["html", "lcovonly", ["text", { skipFull: true }]],
  },
});
