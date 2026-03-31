import type { TestResult } from "@rstest/core";
import { escapeXML } from "./xml-escape.js";

export interface SonarFile {
  path: string;
  results: TestResult[];
}

export function generateXml(files: SonarFile[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testExecutions version="1">',
    ...files.map(generateFileElement),
    "</testExecutions>",
  ];

  return lines.join("\n");
}

function generateFileElement(file: SonarFile): string {
  const lines = [
    `  <file path="${escapeXML(file.path)}">`,
    ...file.results.flatMap(generateTestCaseElement),
    `  </file>`,
  ];

  return lines.join("\n");
}

function generateTestCaseElement(test: TestResult): string[] {
  const name = escapeXML(buildTestName(test));
  const duration = Math.round(test.duration ?? 0);
  const open = `    <testCase name="${name}" duration="${duration}"`;

  if (test.status === "fail") {
    const errors = test.errors ?? [];
    const error = errors[0];

    if (error) {
      const tag = error.name === "AssertionError" ? "failure" : "error";
      const message = escapeXML(error.message ?? "");
      const stack = error.stack ?? "";
      return [
        `${open}>`,
        `      <${tag} message="${message}">`,
        `        <![CDATA[${stack}]]>`,
        `      </${tag}>`,
        `    </testCase>`,
      ];
    }

    return [`${open} />`];
  }

  if (test.status === "skip" || test.status === "todo") {
    return [`${open}>`, `      <skipped message=""/>`, `    </testCase>`];
  }

  return [`${open} />`];
}

function buildTestName(test: TestResult): string {
  return (test.parentNames ?? []).concat(test.name).join(" > ");
}
