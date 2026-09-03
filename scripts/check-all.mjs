import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// 公開版を作り直してから、検査を定義順に一度ずつ実行する最終ゲート。
// 個別スクリプトは単独でも使えるが、通常の入口はこのファイルに集約する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(root, 'build', 'report', 'check-gate.json');
const steps = [
  { name: 'build', command: process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm',
    args: process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'] },
  { name: 'version', command: process.execPath, args: ['scripts/check-version.mjs'] },
  { name: 'application-targets', command: process.execPath, args: ['scripts/check-application-targets.mjs'] },
  { name: 'state', command: process.execPath, args: ['scripts/check-state.mjs'] },
  { name: 'state-classification', command: process.execPath, args: ['scripts/check-state-classification.mjs'] },
  { name: 'state-mutations', command: process.execPath, args: ['scripts/check-state-mutations.mjs'] },
  { name: 'state-restore', command: process.execPath, args: ['scripts/check-state-restore.mjs'] },
  { name: 'browser-flow', command: process.execPath, args: ['scripts/check-browser-flow.mjs'] },
  { name: 'dialog-chains', command: process.execPath, args: ['scripts/check-dialog-chains.mjs'] },
  { name: 'ui-effects', command: process.execPath, args: ['scripts/check-ui-effects.mjs'] },
  { name: 'progression-flows', command: process.execPath, args: ['scripts/check-progression-flows.mjs'] },
  { name: 'esm', command: process.execPath, args: ['scripts/check-esm.mjs'] },
  { name: 'source-boundaries', command: process.execPath, args: ['scripts/check-source-boundaries.mjs'] },
  { name: 'compat-e2e', command: process.execPath, args: ['scripts/check-compat-e2e.mjs'] },
  { name: 'browser-e2e', command: process.execPath, args: ['scripts/check-browser-e2e.mjs'] },
  { name: 'refactor-baseline-generate', command: process.execPath, args: ['scripts/generate-refactor-baseline.mjs'] },
  { name: 'refactor-baseline', command: process.execPath, args: ['scripts/check-refactor-baseline.mjs'] },
  { name: 'esm-dependencies', command: process.execPath, args: ['scripts/check-esm-dependencies.mjs'] },
  { name: 'public-esm', command: process.execPath, args: ['scripts/check-public-esm.mjs'] },
  { name: 'metrics-update-policy', command: process.execPath, args: ['scripts/check-metrics-update.mjs'] },
  { name: 'refactor-policy', command: process.execPath, args: ['scripts/check-refactor-policy.mjs'] },
  { name: 'trace', command: process.execPath, args: ['scripts/check-trace-index.mjs'] },
  { name: 'ui-data-map', command: process.execPath, args: ['scripts/check-ui-data-map.mjs'] },
  { name: 'event-wiring', command: process.execPath, args: ['scripts/check-event-wiring.mjs'] },
  { name: 'refactor-report', command: process.execPath, args: ['scripts/check-refactor-report.mjs'] },
  { name: 'global-access', command: process.execPath, args: ['scripts/check-global-access-contract.mjs'] },
  { name: 'unused-files', command: process.execPath, args: ['scripts/check-unused-files.mjs'] },
  { name: 'manifest-dependencies', command: process.execPath, args: ['scripts/check-manifest-dependencies.mjs'] },
  { name: 'public-symbols', command: process.execPath, args: ['scripts/check-public-symbols.mjs'] }
];

const run = (step) => new Promise(resolve => {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  // shellを介さず実行する。Windowsではnode.exeのパスに空白が含まれるため、
  // shell=trueにすると検査自体が「C:\Program」を実行しようとして失敗する。
  const child = spawn(step.command, step.args, { cwd: root, shell: false });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('close', code => resolve({
    name: step.name, command: [step.command, ...step.args].join(' '), startedAt,
    finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
    exitCode: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim()
  }));
  child.on('error', error => resolve({
    name: step.name, command: [step.command, ...step.args].join(' '), startedAt,
    finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
    exitCode: 1, stdout: stdout.trim(), stderr: `${stderr.trim()}\n${error.message}`.trim()
  }));
});

const report = { schemaVersion: 1, name: 'wake7-check-gate', startedAt: new Date().toISOString(), steps: [], passed: false };
await mkdir(dirname(reportPath), { recursive: true });
for (const step of steps) {
  const result = await run(step);
  report.steps.push(result);
  console.log(`[${result.exitCode === 0 ? 'ok' : 'FAIL'}] ${result.name} (${result.durationMs}ms)`);
  if (result.exitCode !== 0) {
    report.failedStep = result.name;
    report.finishedAt = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.error(`Check gate failed at ${result.name}. Report: ${reportPath}`);
    process.exitCode = result.exitCode;
    break;
  }
}
if (!report.failedStep) {
  report.passed = true;
  report.finishedAt = new Date().toISOString();
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Check gate passed: ${report.steps.length} steps. Report: ${reportPath}`);
}
