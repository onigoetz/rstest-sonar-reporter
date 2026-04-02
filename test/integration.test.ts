import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { afterEach, beforeEach, describe, expect, it } from "@rstest/core";

const CWD = process.cwd();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => ["file", "testCase"].includes(name),
});

describe("SonarReporter integration", () => {
  let tmpDir: string;
  let outputFile: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "rstest-sonar-integration-"));
    outputFile = join(tmpDir, "sonar-report.xml");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it("produces well-formed XML with correct structure from real fixture run", () => {
    const result = spawnSync("yarn", ["rstest", "run", "--config", "test/fixture.config.ts"], {
      cwd: CWD,
      env: { ...process.env, SONAR_OUTPUT_FILE: outputFile },
      stdio: "pipe",
    });

    console.log("STDOUT", result.stdout.toString(), "STDERR", result.stderr.toString());

    const xml = readFileSync(outputFile, "utf-8");

    // Validate well-formedness
    const validation = XMLValidator.validate(xml);
    expect(validation).toBe(true);

    const { testExecutions } = parser.parse(xml);

    expect(testExecutions.version).toBe("1");

    const files: Array<{ path: string; testCase: Array<Record<string, unknown>> }> =
      testExecutions.file;

    // Three fixture files, sorted alphabetically
    expect(files.map((f) => f.path)).toEqual([
      "test/fixtures/failing.test.ts",
      "test/fixtures/passing.test.ts",
      "test/fixtures/skipped.test.ts",
    ]);

    // failing.test.ts — one assertion failure, one runtime error
    const [failing, passing, skipped] = files;

    expect(failing.testCase).toHaveLength(2);

    const [assertionFail, runtimeFail] = failing.testCase;
    expect(assertionFail.name).toBe("broken > fails with assertion error");
    expect(Number(assertionFail.duration)).toBeGreaterThanOrEqual(0);
    expect(assertionFail).toHaveProperty("failure");
    expect((assertionFail.failure as { message: string }).message).toContain("expected 1 to be 2");

    expect(runtimeFail.name).toBe("broken > fails with runtime error");
    expect(runtimeFail).toHaveProperty("error");
    expect((runtimeFail.error as { message: string }).message).toContain(
      "Cannot read properties of null",
    );

    // passing.test.ts — three passing tests, no failure/error/skipped child
    expect(passing.testCase).toHaveLength(3);
    expect(passing.testCase.map((t) => t.name)).toEqual([
      "math > adds numbers",
      "math > multiplies numbers",
      "math > subtraction > subtracts numbers",
    ]);
    for (const tc of passing.testCase) {
      expect(tc).not.toHaveProperty("failure");
      expect(tc).not.toHaveProperty("error");
      expect(tc).not.toHaveProperty("skipped");
    }

    // skipped.test.ts — two skipped tests
    expect(skipped.testCase).toHaveLength(2);
    expect(skipped.testCase[0].name).toBe("pending > is skipped");
    expect(skipped.testCase[1].name).toBe("pending > is todo");
    for (const tc of skipped.testCase) {
      expect(tc).toHaveProperty("skipped");
    }
  });
});
