import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 変更範囲を選び、選んだプロファイルを実行して結果を一つの証跡へ残す。
// 未実行を成功扱いにしないため、失敗と未完了を明示的に分ける。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const config = JSON.parse(await readFile(join(root, 'scripts/check-profiles.json'), 'utf8'));
const requested = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
const changedFiles = raw.split('\0').filter(Boolean).map(entry => entry.slice(3)).filter(Boolean);
const ignoredFiles = changedFiles.filter(file => file.startsWith('build/report/'));
const files = changedFiles.filter(file => !ignoredFiles.includes(file));
// 改修開始時に、変更範囲と関連featureを必ず先に記録する。
// 失敗時は影響調査なしで検査を進めず、安全側へ倒す。
const investigation = spawn(process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'node',
  process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run investigate:changed'] : ['scripts/investigate-changed.mjs'],
  { cwd: root, stdio: 'inherit' });
const investigationExit = await new Promise(resolve => {
  investigation.on('close', code => resolve(code ?? 1));
  investigation.on('error', () => resolve(1));
});
if (investigationExit !== 0) throw new Error('影響調査に失敗したため、検査を中断します');
let investigationReport = null;
try { investigationReport = JSON.parse(await readFile(join(reportDir, 'feature-investigation-changed.json'), 'utf8')); } catch { /* 調査スクリプトが生成するため通常は到達しない */ }
// 検査基盤・共有状態・主要導線・公開生成物の変更は、部分検査を成功扱いにしない。
const fullRules = (config.policy?.fullGateRequired?.paths || []).map(path =>
  new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
const affectedRules = [/^src\//, /^(?:styles?|public)\//, /\.(?:css|html|svg)$/i];
const reasons = [];
let selected = requested;
if (!selected) {
  selected = investigationReport?.recommendedProfile || 'fast';
  for (const file of files) {
    if (fullRules.some(rule => rule.test(file))) selected = 'full';
    else if (selected === 'fast' && affectedRules.some(rule => rule.test(file))) selected = 'affected';
    else if (selected === 'fast') selected = 'affected';
  }
  reasons.push(files.length ? '変更ファイルから自動選択' : '変更ファイルがないためfast');
} else reasons.push(`指定されたプロファイル: ${selected}`);
if (!config.profiles[selected]) throw new Error(`不明な検査プロファイルです: ${selected}`);
const fullGateRequired = selected !== 'full' && files.some(file => fullRules.some(rule => rule.test(file)));
const featureChecks = investigationReport?.requiredChecks || [];
const requiredChecks = [...new Set([...config.profiles[selected].steps, ...featureChecks])];
if (investigationReport?.features?.length) {
  reasons.push(`関連feature: ${investigationReport.features.map(item => item.name).join(', ')}`);
  if (investigationReport.relatedE2E?.length) reasons.push(`関連E2E: ${investigationReport.relatedE2E.join(', ')}`);
}
if (fullGateRequired) reasons.push(config.policy?.fullGateRequired?.reason || '共有基盤の変更のためfull gateが必要');
const commandFor = name => {
  const direct = {
    'domain-classification': ['node', ['scripts/check-domain-classification.mjs']],
    'development-entrypoints': ['node', ['scripts/check-development-entrypoints.mjs']],
    build: ['npm', ['run', 'build']], version: ['node', ['scripts/check-version.mjs']],
    'board-domain': ['node', ['scripts/test-board-domain.mjs']],
    'application-services': ['node', ['scripts/test-application-services.mjs']],
    'application-targets': ['node', ['scripts/check-application-targets.mjs']], state: ['node', ['scripts/check-state.mjs']]
    , 'reward-access': ['node', ['scripts/check-reward-access.mjs']]
  };
  return direct[name] || ['npm', ['run', `check:${name}`]];
};
const run = (name, command, args) => new Promise(resolve => {
  const startedAt = new Date().toISOString(); const started = Date.now(); let output = ''; let error = '';
  const child = spawn(command, args, {
    cwd: root,
    shell: process.platform === 'win32' && command === 'npm',
    env: { ...process.env, WAKE7_REPORT_SCOPE: selected === 'full' ? 'full' : 'affected' }
  });
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { error += data; });
  child.on('close', exitCode => resolve({ name, command: [command, ...args].join(' '), startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, exitCode: exitCode ?? 1, output: output.trim(), error: error.trim() }));
  child.on('error', cause => resolve({ name, command: [command, ...args].join(' '), startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - started, exitCode: 1, output: output.trim(), error: cause.message }));
});
const executed = []; const unexecuted = [];
// 自動プロファイルでも、変更と関連検査の対応表を先に検証・提示する。
const featureRegistry = await run('feature-registry', process.execPath, ['scripts/check-feature-registry.mjs', '--changed']);
executed.push(featureRegistry);
const changeClassification = await run('change-classification', process.execPath, ['scripts/check-change-classification.mjs']);
executed.push(changeClassification);
if (selected === 'full') {
  const gate = await run('check:gate', 'npm', ['run', 'check:gate']);
  let report = null; try { report = JSON.parse(await readFile(join(reportDir, 'check-gate.json'), 'utf8')); } catch { /* 結果がなければ未完了 */ }
  const byName = new Map((report?.steps || []).map(step => [step.name, step]));
  for (const name of requiredChecks) executed.push(byName.get(name) || { name, exitCode: gate.exitCode, durationMs: gate.durationMs, output: gate.output, error: gate.error });
  if (!report) unexecuted.push(...requiredChecks.map(name => ({ name, reason: 'check:gate結果レポートがない' })));
} else {
  for (const name of requiredChecks) executed.push(await run(name, ...commandFor(name)));
}
const failed = executed.filter(item => item.exitCode !== 0 && item.passed !== true);
const status = failed.length ? 'failed' : unexecuted.length || fullGateRequired ? 'incomplete' : 'passed';
const sourceRevision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || 'working-tree';
const skippedChecks = selected === 'full' ? [] : [{ name: 'device-e2e', reason: 'デバイス差分は公開前のcheck:gateで実行' }];
const result = { schemaVersion: 1, name: 'wake7-check-profile-result', generatedAt: new Date().toISOString(), sourceRevision, status, warnings: status === 'incomplete' ? ['未実行またはfull gate未完了'] : [], errors: failed.map(item => item.name), profile: selected, changedFiles: files, ignoredFiles, fullGateRequired, selectionReasons: reasons, requiredChecks, executed: executed.map(item => ({ name: item.name, command: item.command || `check:gate → ${item.name}`, startedAt: item.startedAt || null, finishedAt: item.finishedAt || null, durationMs: item.durationMs || 0, exitCode: item.exitCode ?? 1, passed: item.passed ?? item.exitCode === 0 })), unexecuted, skippedChecks, summary: { required: requiredChecks.length, executed: executed.length, unexecuted: unexecuted.length, skipped: skippedChecks.length, failed: failed.length, durationMs: executed.reduce((total, item) => total + (item.durationMs || 0), 0) }, policy: { passed: '必須検査をすべて実行し、全件成功', incomplete: '未実行またはfull gate未完了のため成功扱いにしない', failed: '実行済み検査に失敗がある', fullGateRequiredReason: config.policy?.fullGateRequired?.reason || null } };
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'check-profile-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Check profile ${selected}: ${result.status}. ${result.summary.executed}/${result.summary.required} executed. Report: build/report/check-profile-result.json`);
if (result.status !== 'passed') process.exitCode = 1;
