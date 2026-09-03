import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { sourceRevision, writeReport } from './lib/report.mjs';

// 公開版を作り直してから、検査を定義順に一度ずつ実行する最終ゲート。
// 個別スクリプトは単独でも使えるが、通常の入口はこのファイルに集約する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(root, 'build', 'report', 'check-gate.json');
const runtimeReportPath = join(root, 'build', 'report', 'check-runtime.json');
const contextPath = join(root, 'build', 'report', 'check-context.json');
const pipeline = JSON.parse(await readFile(join(root, 'scripts', 'check-pipeline.json'), 'utf8'));
const steps = [
  { name: 'domain-classification', command: process.execPath, args: ['scripts/check-domain-classification.mjs'] },
  { name: 'build', command: process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm',
    args: process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'] },
  { name: 'version', command: process.execPath, args: ['scripts/check-version.mjs'] },
  { name: 'board-domain', command: process.execPath, args: ['scripts/test-board-domain.mjs'] },
  { name: 'application-services', command: process.execPath, args: ['scripts/test-application-services.mjs'] },
  { name: 'application-targets', command: process.execPath, args: ['scripts/check-application-targets.mjs'] },
  { name: 'state', command: process.execPath, args: ['scripts/check-state.mjs'] },
  { name: 'state-classification', command: process.execPath, args: ['scripts/check-state-classification.mjs'] },
  { name: 'state-mutations', command: process.execPath, args: ['scripts/check-state-mutations.mjs'] },
  { name: 'state-restore', command: process.execPath, args: ['scripts/check-state-restore.mjs'] },
  { name: 'browser-flow', command: process.execPath, args: ['scripts/check-browser-flow.mjs'] },
  { name: 'dialog-chains', command: process.execPath, args: ['scripts/check-dialog-chains.mjs'] },
  { name: 'ui-effects', command: process.execPath, args: ['scripts/check-ui-effects.mjs'] },
  { name: 'progression-flows', command: process.execPath, args: ['scripts/check-progression-flows.mjs'] },
  { name: 'progression-flow-contract', command: process.execPath, args: ['scripts/check-progression-flow-contract.mjs'] },
  { name: 'esm', command: process.execPath, args: ['scripts/check-esm.mjs'] },
  { name: 'source-boundaries', command: process.execPath, args: ['scripts/check-source-boundaries.mjs'] },
  { name: 'compat-e2e', command: process.execPath, args: ['scripts/check-compat-e2e.mjs'] },
  { name: 'browser-e2e', command: process.execPath, args: ['scripts/check-browser-e2e.mjs'] },
  { name: 'device-e2e', command: process.execPath, args: ['scripts/check-device-e2e.mjs'] },
  // 構造予算より先に、最新の状態参照レポートを生成する。
  { name: 'global-access', command: process.execPath, args: ['scripts/check-global-access-contract.mjs'] },
  { name: 'state-access-policy', command: process.execPath, args: ['scripts/check-state-access-policy.mjs'] },
  { name: 'refactor-baseline-generate', command: process.execPath, args: ['scripts/generate-refactor-baseline.mjs'] },
  { name: 'refactor-baseline', command: process.execPath, args: ['scripts/check-refactor-baseline.mjs'] },
  { name: 'refactor-budgets', command: process.execPath, args: ['scripts/check-refactor-budgets.mjs'] },
  { name: 'esm-dependencies', command: process.execPath, args: ['scripts/check-esm-dependencies.mjs'] },
  { name: 'public-esm', command: process.execPath, args: ['scripts/check-public-esm.mjs'] },
  { name: 'metrics-update-policy', command: process.execPath, args: ['scripts/check-metrics-update.mjs'] },
  { name: 'refactor-policy', command: process.execPath, args: ['scripts/check-refactor-policy.mjs'] },
  { name: 'trace', command: process.execPath, args: ['scripts/check-trace-index.mjs'] },
  { name: 'progression-responsibility', command: process.execPath, args: ['scripts/check-progression-responsibility.mjs'] },
  { name: 'ui-data-map', command: process.execPath, args: ['scripts/check-ui-data-map.mjs'] },
  { name: 'event-wiring', command: process.execPath, args: ['scripts/check-event-wiring.mjs'] },
  { name: 'refactor-report', command: process.execPath, args: ['scripts/check-refactor-report.mjs'] },
  // 互換監査を先に生成し、unused-filesのレビュー一覧へ同じ判断情報を渡す。
  { name: 'compat-boundaries', command: process.execPath, args: ['scripts/check-compat-boundaries.mjs'] },
  { name: 'unused-files', command: process.execPath, args: ['scripts/check-unused-files.mjs'] },
  { name: 'manifest-dependencies', command: process.execPath, args: ['scripts/check-manifest-dependencies.mjs'] },
  { name: 'public-symbols', command: process.execPath, args: ['scripts/check-public-symbols.mjs'] },
  { name: 'report-schema', command: process.execPath, args: ['scripts/check-report-schema.mjs'] }
];

const groups = pipeline.groups || {};
const groupByStep = new Map(Object.entries(groups).flatMap(([name, group]) =>
  (group.steps || []).map(stepName => [stepName, { name, label: group.label }])));
const missingGroups = steps.map(step => step.name).filter(name => !groupByStep.has(name));
const duplicateGroups = [...new Set(steps.map(step => step.name))].filter(name =>
  Object.values(groups).filter(group => (group.steps || []).includes(name)).length > 1);
if (missingGroups.length) throw new Error(`check-pipeline.json に未分類のゲート手順があります: ${missingGroups.join(', ')}`);
if (duplicateGroups.length) throw new Error(`check-pipeline.json で複数領域に分類された手順があります: ${duplicateGroups.join(', ')}`);

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
    name: step.name, profile: pipeline.steps[step.name], group: groupByStep.get(step.name).name,
    groupLabel: groupByStep.get(step.name).label, command: [step.command, ...step.args].join(' '), startedAt,
    finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
    exitCode: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim()
  }));
  child.on('error', error => resolve({
    name: step.name, profile: pipeline.steps[step.name], command: [step.command, ...step.args].join(' '), startedAt,
    finishedAt: new Date().toISOString(), durationMs: Date.now() - started,
    exitCode: 1, stdout: stdout.trim(), stderr: `${stderr.trim()}\n${error.message}`.trim()
  }));
});

const reportLinksFor = async result => {
  const links = new Set();
  const text = `${result.stdout}\n${result.stderr}`;
  for (const match of text.matchAll(/(?:build[\\/]report[\\/])([^\s"']+)/g)) {
    links.add(`build/report/${match[1].replaceAll('\\\\', '/')}`);
  }
  const candidates = [
    `build/report/${result.name}.json`,
    `build/report/${result.name.replaceAll('-contract', '')}.json`,
    `build/report/${result.name.replaceAll('-policy', '')}.json`
  ];
  for (const candidate of candidates) {
    try { await access(join(root, candidate)); links.add(candidate); } catch { /* レポートを持たない検査もある */ }
  }
  return [...links];
};

const unmapped = steps.map(step => step.name).filter(name => !pipeline.steps[name]);
if (unmapped.length) throw new Error(`check-pipeline.json に未分類の検査があります: ${unmapped.join(', ')}`);
const context = {
  schemaVersion: 1,
  name: 'wake7-check-context',
  generatedAt: new Date().toISOString(),
  sourceRevision: await sourceRevision(root),
  purpose: '同一ゲート内の検査が参照する生成物・ソース基準を共有する。個別検査の厳格さは変更しない。',
  artifacts: { publicHtml: 'index.html', manifest: 'scripts/application-manifest.mjs' },
  reusePolicy: '検査は必要な入力を個別に再読込してよい。将来の共有解析導入時も、この基準と結果形式を維持する。'
};
await mkdir(dirname(contextPath), { recursive: true });
await writeReport(contextPath, context);
const report = { schemaVersion: 1, name: 'wake7-check-gate', startedAt: new Date().toISOString(), contextPath: 'build/report/check-context.json', steps: [], passed: false,
  status: 'failed', summary: {}, warnings: [], errors: [], sourceRevision: await sourceRevision(root) };
await mkdir(dirname(reportPath), { recursive: true });
for (const step of steps) {
  const result = await run(step);
  result.reportLinks = await reportLinksFor(result);
  report.steps.push(result);
  console.log(`[${result.exitCode === 0 ? 'ok' : 'FAIL'}] ${result.name} (${result.durationMs}ms)`);
  if (result.exitCode !== 0) {
    report.failedStep = result.name;
    report.failedGroup = { name: result.group, label: result.groupLabel };
    report.summary = summarize(report.steps);
    report.finishedAt = new Date().toISOString();
    await writeReport(reportPath, { ...report, generatedAt: report.finishedAt });
    console.error(`Check gate failed in ${result.groupLabel} (${result.group}): ${result.name}. Report: ${reportPath}`);
    if (result.reportLinks.length) console.error(`詳細レポート: ${result.reportLinks.join(', ')}`);
    process.exitCode = result.exitCode;
    break;
  }
}
if (!report.failedStep) {
  report.passed = true;
  report.finishedAt = new Date().toISOString();
  report.status = 'passed';
  const byProfile = Object.fromEntries(Object.keys(pipeline.profiles).map(profile => {
    const profileSteps = report.steps.filter(step => step.profile === profile);
    const durationMs = profileSteps.reduce((total, step) => total + step.durationMs, 0);
    const budgetMs = pipeline.profiles[profile].budgetMs;
    return [profile, { steps: profileSteps.length, durationMs, budgetMs, withinBudget: durationMs <= budgetMs }];
  }));
  const byGroup = Object.fromEntries(Object.entries(groups).map(([name, group]) => {
    const groupSteps = report.steps.filter(step => step.group === name);
    return [name, { label: group.label, steps: groupSteps.length,
      durationMs: groupSteps.reduce((total, step) => total + step.durationMs, 0),
      passed: groupSteps.every(step => step.exitCode === 0) }];
  }));
  const slowest = [...report.steps].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5)
    .map(step => ({ name: step.name, profile: step.profile, durationMs: step.durationMs }));
  report.summary = { steps: report.steps.length, failedStep: null, byProfile, byGroup, slowest };
  report.runtime = { schemaVersion: 1, generatedAt: report.finishedAt, contextPath: 'build/report/check-context.json', profiles: byProfile, groups: byGroup, slowest };
  await writeReport(runtimeReportPath, { schemaVersion: 1, name: 'wake7-check-runtime', generatedAt: report.finishedAt, sourceRevision: report.sourceRevision, profiles: byProfile, groups: byGroup, slowest });
  await writeReport(reportPath, { ...report, generatedAt: report.finishedAt });
  console.log('Check gate summary:');
  for (const [name, summary] of Object.entries(byGroup)) {
    console.log(`  [${summary.label}] ${summary.steps}件 / ${summary.durationMs}ms / ${summary.passed ? 'ok' : 'FAIL'} (${name})`);
  }
  console.log(`Check gate passed: ${report.steps.length} steps. Report: ${reportPath}`);
}

function summarize(results) {
  return { steps: results.length, failedStep: results.find(step => step.exitCode !== 0)?.name || null,
    byGroup: Object.fromEntries(Object.entries(groups).map(([name, group]) => {
      const groupSteps = results.filter(step => step.group === name);
      return [name, { label: group.label, steps: groupSteps.length,
        durationMs: groupSteps.reduce((total, step) => total + step.durationMs, 0),
        passed: groupSteps.length > 0 && groupSteps.every(step => step.exitCode === 0) }];
    })) };
}
