import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { Reporter, TestFileResult } from '@rstest/core';
import { generateXml, type SonarFile } from './xml.js';

export interface SonarReporterOptions {
  /** Required: path where the XML report will be written */
  outputFile: string;
  /** Optional: transform file paths written into the XML output */
  onWritePath?: (path: string) => string;
}

export class SonarReporter implements Reporter {
  private readonly options: SonarReporterOptions;

  constructor(options: SonarReporterOptions) {
    if (!options.outputFile) {
      throw new Error(
        'SonarReporter requires "outputFile" option.\n' +
          'Example: reporters: [new SonarReporter({ outputFile: "sonar-report.xml" })]',
      );
    }
    this.options = options;
  }

  async onTestRunEnd({ results }: { results: TestFileResult[] }): Promise<void> {
    const resolvePath = this.options.onWritePath ?? ((p) => p);
    const cwd = process.cwd();

    const files: SonarFile[] = results
      .map((fileResult) => ({
        path: resolvePath(relative(cwd, fileResult.testPath).replace(/\\/g, '/')),
        results: fileResult.results,
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

    const xml = generateXml(files);
    const outputPath = this.options.outputFile;

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, xml, 'utf-8');

    console.log(`SonarQube report written to ${outputPath}`);
  }
}
