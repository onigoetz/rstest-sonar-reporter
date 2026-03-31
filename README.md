# rstest-sonar-reporter

A [rstest](https://rstest.rs/) reporter that outputs test results in [SonarQube's Generic Test Execution](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/test-coverage/generic-test-data#generic-test-execution) XML format.

## Installation

```sh
npm install -D rstest-sonar-reporter
# or
yarn add -D rstest-sonar-reporter
# or
pnpm add -D rstest-sonar-reporter
```

## Usage

Add `SonarReporter` to the `reporters` array in your rstest config:

```ts
// rstest.config.ts
import { defineConfig } from '@rstest/core';
import { SonarReporter } from 'rstest-sonar-reporter';

export default defineConfig({
  reporters: [
    new SonarReporter({ outputFile: 'reports/sonar-report.xml' }),
  ],
});
```

Then tell SonarQube where to find the report by setting the `sonar.testExecutionReportPaths` property in your `sonar-project.properties`:

```properties
sonar.testExecutionReportPaths=reports/sonar-report.xml
```

## Options

### `outputFile` (required)

Path where the XML report will be written. The directory is created automatically if it does not exist.

```ts
new SonarReporter({ outputFile: 'reports/sonar-report.xml' })
```

### `onWritePath` (optional)

A function that transforms each test file path before it is written into the XML. Useful when SonarQube analyses a project from a root directory that differs from where rstest runs, or when you need to add a path prefix.

```ts
new SonarReporter({
  outputFile: 'sonar-report.xml',
  onWritePath: (path) => `frontend/${path}`,
})
```

## Output format

The reporter produces a file conforming to the [Generic Test Execution](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/test-coverage/generic-test-data#generic-test-execution) schema:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testExecutions version="1">
  <file path="src/math.test.ts">
    <testCase name="math > adds numbers" duration="12" />
    <testCase name="math > fails" duration="5">
      <failure message="expected 1 to be 2">
        <![CDATA[AssertionError: expected 1 to be 2
  at src/math.test.ts:5]]>
      </failure>
    </testCase>
    <testCase name="math > is skipped" duration="0">
      <skipped message=""/>
    </testCase>
  </file>
</testExecutions>
```

- **Passing** tests produce a self-closing `<testCase />` element.
- **Failed** tests with an `AssertionError` produce a `<failure>` child element.
- **Failed** tests with any other error type produce an `<error>` child element.
- **Skipped** and **todo** tests produce a `<skipped>` child element.
- Test names include their full suite hierarchy joined with ` > ` (e.g. `suite > subsuite > test name`).
- Durations are in milliseconds, rounded to the nearest integer.
- File paths are relative to `process.cwd()` and use forward slashes.
- Files are sorted alphabetically for deterministic output.

## Credits

Credits to @ariperkkio for the creation of https://www.npmjs.com/package/vitest-sonar-reporter. Inspired the API of this implementation.

## License

MIT
