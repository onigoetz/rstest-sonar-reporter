import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import type { TestFileResult, TestResult } from '@rstest/core';
import { SonarReporter } from '../src/sonar-reporter.js';

const CWD = process.cwd();

function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    testId: 'test-id',
    status: 'pass',
    name: 'a test',
    testPath: join(CWD, 'src/foo.test.ts'),
    project: 'default',
    duration: 10,
    ...overrides,
  };
}

function makeFileResult(testPath: string, results: TestResult[]): TestFileResult {
  return {
    testId: 'file-id',
    status: 'pass',
    name: testPath,
    testPath: join(CWD, testPath),
    project: 'default',
    results,
  };
}

function makeRunEndContext(results: TestFileResult[]) {
  return {
    results,
    testResults: results.flatMap((f) => f.results),
    duration: { totalTime: 100, buildTime: 20, testTime: 80 },
  };
}

describe('SonarReporter constructor', () => {
  it('throws when outputFile is not provided', () => {
    expect(() => new SonarReporter({ outputFile: '' })).toThrow(
      'SonarReporter requires "outputFile" option.',
    );
  });

  it('does not throw when outputFile is provided', () => {
    expect(() => new SonarReporter({ outputFile: 'sonar-report.xml' })).not.toThrow();
  });
});

describe('SonarReporter.onTestRunEnd', () => {
  let tmpDir: string;
  let outputFile: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'rstest-sonar-'));
    outputFile = join(tmpDir, 'sonar-report.xml');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('writes the XML report to outputFile', async () => {
    const reporter = new SonarReporter({ outputFile });
    await reporter.onTestRunEnd(makeRunEndContext([
      makeFileResult('src/foo.test.ts', [makeTestResult({ name: 'passes', status: 'pass', duration: 50 })]),
    ]));

    expect(existsSync(outputFile)).toBe(true);
  });

  it('creates output directory if it does not exist', async () => {
    const nestedOutput = join(tmpDir, 'nested', 'deep', 'report.xml');
    const reporter = new SonarReporter({ outputFile: nestedOutput });
    await reporter.onTestRunEnd(makeRunEndContext([]));

    expect(existsSync(nestedOutput)).toBe(true);
  });

  it('writes valid XML with correct structure', async () => {
    const reporter = new SonarReporter({ outputFile });
    await reporter.onTestRunEnd(makeRunEndContext([
      makeFileResult('src/foo.test.ts', [
        makeTestResult({ name: 'passes', status: 'pass', duration: 100 }),
      ]),
    ]));

    const xml = readFileSync(outputFile, 'utf-8');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testExecutions version="1">');
    expect(xml).toContain('<file path="src/foo.test.ts">');
    expect(xml).toContain('<testCase name="passes" duration="100" />');
  });

  it('uses relative path from cwd for file paths', async () => {
    const reporter = new SonarReporter({ outputFile });
    const absolutePath = join(CWD, 'src/my.test.ts');
    const fileResult = makeFileResult('src/my.test.ts', [makeTestResult()]);
    fileResult.testPath = absolutePath;

    await reporter.onTestRunEnd(makeRunEndContext([fileResult]));

    const xml = readFileSync(outputFile, 'utf-8');
    expect(xml).toContain('path="src/my.test.ts"');
    expect(xml).not.toContain(CWD);
  });

  it('applies onWritePath to transform file paths', async () => {
    const reporter = new SonarReporter({
      outputFile,
      onWritePath: (path) => `frontend/${path}`,
    });
    await reporter.onTestRunEnd(makeRunEndContext([
      makeFileResult('src/foo.test.ts', [makeTestResult()]),
    ]));

    const xml = readFileSync(outputFile, 'utf-8');
    expect(xml).toContain('path="frontend/src/foo.test.ts"');
  });

  it('sorts files alphabetically by path', async () => {
    const reporter = new SonarReporter({ outputFile });
    await reporter.onTestRunEnd(makeRunEndContext([
      makeFileResult('src/z.test.ts', [makeTestResult({ name: 'z' })]),
      makeFileResult('src/a.test.ts', [makeTestResult({ name: 'a' })]),
    ]));

    const xml = readFileSync(outputFile, 'utf-8');
    const aIdx = xml.indexOf('src/a.test.ts');
    const zIdx = xml.indexOf('src/z.test.ts');
    expect(aIdx).toBeLessThan(zIdx);
  });

  it('writes full snapshot for mixed pass/fail/skip results', async () => {
    const reporter = new SonarReporter({ outputFile });
    await reporter.onTestRunEnd(makeRunEndContext([
      makeFileResult('src/example.test.ts', [
        makeTestResult({ name: 'passes', parentNames: ['suite'], status: 'pass', duration: 100 }),
        makeTestResult({
          name: 'fails',
          parentNames: ['suite'],
          status: 'fail',
          duration: 50,
          errors: [{ message: 'expected 1 to be 2', name: 'AssertionError', stack: 'at foo:1' }],
        }),
        makeTestResult({ name: 'is skipped', parentNames: ['suite'], status: 'skip', duration: 0 }),
        makeTestResult({ name: 'is todo', parentNames: ['suite'], status: 'todo', duration: 0 }),
        makeTestResult({
          name: 'runtime error',
          parentNames: ['suite'],
          status: 'fail',
          duration: 5,
          errors: [{ message: 'Cannot read properties of null', name: 'TypeError', stack: 'TypeError: Cannot read properties of null\n  at bar:2' }],
        }),
      ]),
    ]));

    const xml = readFileSync(outputFile, 'utf-8');
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
    <testCase name="suite &gt; is todo" duration="0">
      <skipped message=""/>
    </testCase>
    <testCase name="suite &gt; runtime error" duration="5">
      <error message="Cannot read properties of null">
        <![CDATA[TypeError: Cannot read properties of null
  at bar:2]]>
      </error>
    </testCase>
  </file>
</testExecutions>"
`);
  });
});
