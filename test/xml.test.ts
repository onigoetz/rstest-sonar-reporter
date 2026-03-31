import { describe, expect, it } from "@rstest/core";
import type { TestResult } from "@rstest/core";
import { generateXml } from "../src/xml.js";

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    testId: "test-id",
    status: "pass",
    name: "test name",
    testPath: "/project/src/foo.test.ts",
    project: "default",
    ...overrides,
  };
}

function makeFile(path: string, results: Partial<TestResult>[]) {
  return { path, results: results.map(makeResult) };
}

describe("generateXml", () => {
  it("produces the root testExecutions element", () => {
    const xml = generateXml([]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testExecutions version="1">');
    expect(xml).toContain("</testExecutions>");
  });

  it("produces a self-closing testCase for passing tests", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [{ status: "pass", name: "passes", duration: 42 }]),
    ]);
    expect(xml).toContain('<testCase name="passes" duration="42" />');
  });

  it("produces a failure element for AssertionError", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [
        {
          status: "fail",
          name: "assertion fails",
          duration: 10,
          errors: [
            {
              message: "expected 1 to be 2",
              name: "AssertionError",
              stack: "AssertionError: expected 1 to be 2\n  at foo.test.ts:5",
            },
          ],
        },
      ]),
    ]);
    expect(xml).toContain('<failure message="expected 1 to be 2">');
    expect(xml).toContain("<![CDATA[AssertionError: expected 1 to be 2");
    expect(xml).not.toContain("<error ");
  });

  it("produces an error element for non-AssertionError", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [
        {
          status: "fail",
          name: "runtime error",
          duration: 5,
          errors: [
            {
              message: "Cannot read properties of null",
              name: "TypeError",
              stack: "TypeError: Cannot read properties of null",
            },
          ],
        },
      ]),
    ]);
    expect(xml).toContain('<error message="Cannot read properties of null">');
    expect(xml).not.toContain("<failure ");
  });

  it("produces a skipped element for skipped tests", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [{ status: "skip", name: "skipped", duration: 0 }]),
    ]);
    expect(xml).toContain('<skipped message=""/>');
  });

  it("produces a skipped element for todo tests", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [{ status: "todo", name: "todo", duration: 0 }]),
    ]);
    expect(xml).toContain('<skipped message=""/>');
  });

  it('builds test name from parentNames and name joined with " > "', () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [
        { name: "test", parentNames: ["suite", "subsuite"], duration: 1 },
      ]),
    ]);
    expect(xml).toContain('name="suite &gt; subsuite &gt; test"');
  });

  it("uses just the test name when there are no parentNames", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [{ name: "top-level test", duration: 1 }]),
    ]);
    expect(xml).toContain('name="top-level test"');
  });

  it("rounds duration to integer", () => {
    const xml = generateXml([makeFile("src/foo.test.ts", [{ duration: 12.7 }])]);
    expect(xml).toContain('duration="13"');
  });

  it("defaults missing duration to 0", () => {
    const xml = generateXml([makeFile("src/foo.test.ts", [{ duration: undefined }])]);
    expect(xml).toContain('duration="0"');
  });

  it("escapes XML special characters in test names", () => {
    const xml = generateXml([makeFile("src/foo.test.ts", [{ name: 'a <b> & "c"', duration: 1 }])]);
    expect(xml).toContain('name="a &lt;b&gt; &amp; &quot;c&quot;"');
  });

  it("escapes XML special characters in file paths", () => {
    const xml = generateXml([makeFile("src/foo&bar.test.ts", [{ name: "test", duration: 1 }])]);
    expect(xml).toContain('path="src/foo&amp;bar.test.ts"');
  });

  it("escapes XML special characters in error messages", () => {
    const xml = generateXml([
      makeFile("src/foo.test.ts", [
        {
          status: "fail",
          name: "fails",
          errors: [
            { message: "expected <div> to equal <span>", name: "AssertionError", stack: "" },
          ],
        },
      ]),
    ]);
    expect(xml).toContain('message="expected &lt;div&gt; to equal &lt;span&gt;"');
  });

  it("produces file elements in the order given", () => {
    const xml = generateXml([
      makeFile("src/a.test.ts", [{ name: "a test", duration: 1 }]),
      makeFile("src/z.test.ts", [{ name: "z test", duration: 1 }]),
    ]);
    const aIdx = xml.indexOf("src/a.test.ts");
    const zIdx = xml.indexOf("src/z.test.ts");
    expect(aIdx).toBeLessThan(zIdx);
  });

  it("produces the full XML structure with multiple files and mixed results", () => {
    const xml = generateXml([
      {
        path: "src/example.test.ts",
        results: [
          makeResult({ name: "passes", parentNames: ["suite"], status: "pass", duration: 100 }),
          makeResult({
            name: "fails",
            parentNames: ["suite"],
            status: "fail",
            duration: 50,
            errors: [{ message: "expected 1 to be 2", name: "AssertionError", stack: "at foo:1" }],
          }),
          makeResult({ name: "is skipped", parentNames: ["suite"], status: "skip", duration: 0 }),
        ],
      },
    ]);

    expect(xml).toMatchInlineSnapshot(`
"<?xml version="1.0" encoding="UTF-8"?>
<testExecutions version="1">
  <file path="src/example.test.ts">
    <testCase name="suite &gt; passes" duration="100" />
    <testCase name="suite &gt; fails" duration="50">
      <failure message="expected 1 to be 2">
        <![CDATA[at foo:1]]>
      </failure>
    </testCase>
    <testCase name="suite &gt; is skipped" duration="0">
      <skipped message=""/>
    </testCase>
  </file>
</testExecutions>"
`);
  });
});
