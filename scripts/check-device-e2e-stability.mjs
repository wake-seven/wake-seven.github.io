import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// device E2E は環境依存のため並列化せず、同じケース集合を3回連続で確認する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const reportPath = join(reportDir, 'device-e2e-stability.json');
const deviceReportPath = join(reportDir, 'device-e2e-result.json');
const execFileAsync = promisify(execFile);
const runs = 3;
const result = {
  schemaVersion: 1,
  name: 'wake7-device-e2e-stability',
  startedAt: new Date().toISOString(),
  runs,
  serial: true,
  passed: false,
  runResults: [],
  comparisons: []
};

const resultSet = report => (report.contexts || []).map(context => ({
  name: context.name,
  cases: (context.cases || []).map(testCase => testCase.name),
  consoleErrors: context.consoleErrors || []
}));

try {
  for (let index = 0; index < runs; index += 1) {
    const execution = await execFileAsync(process.execPath, ['scripts/check-device-e2e.mjs'], {
      cwd: root,
      env: { ...process.env, WAKE7_DEVICE_STABILITY_RUN: String(index + 1) },
      maxBuffer: 1024 * 1024 * 8
    }).catch(error => ({ stdout: error.stdout || '', stderr: error.stderr || error.message, error }));
    const report = JSON.parse(await readFile(deviceReportPath, 'utf8'));
    const set = resultSet(report);
    result.runResults.push({
      run: index + 1,
      passed: report.passed === true,
      exitCode: execution.error ? (execution.error.code ?? 1) : 0,
      resultSet: set,
      consoleErrors: report.consoleErrors || []
    });
    if (execution.error) throw execution.error;
    assert.equal(report.passed, true, `device E2E stability run ${index + 1} failed`);
    if (index > 0) {
      const baseline = result.runResults[0].resultSet;
      assert.deepEqual(set, baseline, `device E2E result set changed between runs 1 and ${index + 1}`);
      result.comparisons.push({ against: 1, run: index + 1, resultSetEqual: true, consoleErrorsEqual: true });
    }
  }
  result.passed = true;
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.error = error.message;
  result.errors = [error.message];
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  result.summary = {
    requiredRuns: runs,
    completedRuns: result.runResults.length,
    comparisons: result.comparisons.length,
    resultSetStable: result.comparisons.length === Math.max(0, result.runResults.length - 1),
    consoleErrors: result.runResults.reduce((total, run) => total + run.consoleErrors.length, 0)
  };
  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  if (result.passed) console.log(`device E2E stability passed: ${runs} serial runs (details: ${reportPath})`);
  else console.error(`device E2E stability failed (details: ${reportPath})`);
}
