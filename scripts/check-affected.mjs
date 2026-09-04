import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertChangeSession, CHANGE_SESSION_PHASES, recordChangeSessionCheck } from './lib/change-session.mjs';

// 変更範囲を選び、選んだプロファイルを実行して結果を一つの証跡へ残す。
// 未実行を成功扱いにしないため、失敗と未完了を明示的に分ける。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const config = JSON.parse(await readFile(join(root, 'scripts/check-profiles.json'), 'utf8'));
const requested = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const requestedPhase = process.argv.find(value => value.startsWith('--phase='))?.slice('--phase='.length) || null;
if (requestedPhase && !Object.values(CHANGE_SESSION_PHASES).includes(requestedPhase)) {
  throw new Error(`不明な改修フェーズです: ${requestedPhase}`);
}
const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
const changedFiles = raw.split('\0').filter(Boolean).map(entry => entry.slice(3)).filter(Boolean);
const ignoredFiles = changedFiles.filter(file => file.startsWith('build/report/'));
const files = changedFiles.filter(file => !ignoredFiles.includes(file));
// affected/fast は改修セッションの開始を必須にする。
const { session: changeSession } = await assertChangeSession(root);
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
// デバッグボタン・固定文言・HUDのような局所変更は、専用の軽量検査へ振り分ける。
// 進行・保存・盤面ロジックを含むファイルが混ざった時点で通常のaffectedへ戻す。
const microFiles = new Set([
  'src/index.template.html',
  'src/runtime/app-events.js',
  'src/ui/progression-hud.js',
  'src/data/ui-text.js',
  'scripts/check-browser-e2e.mjs',
  'scripts/e2e-speed-contract.json',
  'scripts/check-affected.mjs',
  'scripts/check-micro-ui.mjs'
]);
const microChange = files.length > 0 && files.every(file => microFiles.has(file));
const reasons = [];
let selected = requested;
if (!selected) {
  // check:autoは編集中の入口なので、最終fullが必要な変更でもaffectedまでに留める。
  // full gateはcheck:releaseへ集約し、必要性だけをreleasePendingとして保持する。
  const recommended = investigationReport?.recommendedProfile || 'fast';
  selected = microChange ? 'micro' : (recommended === 'full' ? 'affected' : recommended);
  if (!microChange) for (const file of files) {
    if (fullRules.some(rule => rule.test(file))) selected = 'affected';
    else if (selected === 'fast' && affectedRules.some(rule => rule.test(file))) selected = 'affected';
    else if (selected === 'fast') selected = 'affected';
  }
  reasons.push(microChange ? '局所UI変更のためmicro' : (files.length ? '変更ファイルから自動選択' : '変更ファイルがないためfast'));
} else reasons.push(`指定されたプロファイル: ${selected}`);
if (selected !== 'micro' && !config.profiles[selected]) throw new Error(`不明な検査プロファイルです: ${selected}`);
const fullGateRequired = selected !== 'full' && !microChange && files.some(file => fullRules.some(rule => rule.test(file)));
const featureChecks = selected === 'micro' ? [] : (investigationReport?.requiredChecks || []);
const profileSteps = selected === 'micro' ? ['build', 'version', 'micro-ui'] : config.profiles[selected].steps;
const requiredChecks = [...new Set([...profileSteps, ...featureChecks])];
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
    'application-targets': ['node', ['scripts/check-application-targets.mjs']], state: ['node', ['scripts/check-state.mjs']],
    'reward-access': ['node', ['scripts/check-reward-access.mjs']],
    'manifest-dependencies': ['node', ['scripts/check-manifest-dependencies.mjs']],
    'micro-ui': ['node', ['scripts/check-micro-ui.mjs']]
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
// milestoneは途中確認なので、将来のfull gate要件をreleasePendingとして残しつつ成功にできる。
// 通常のcheck:affectedは従来どおり、full必須変更を成功扱いにしない。
const releasePending = fullGateRequired && selected !== 'full';
const allowPendingRelease = [CHANGE_SESSION_PHASES.editing, CHANGE_SESSION_PHASES.milestone].includes(requestedPhase);
const status = failed.length ? 'failed'
  : unexecuted.length || (releasePending && !allowPendingRelease) ? 'incomplete'
    : 'passed';
const sourceRevision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() || 'working-tree';
const skippedChecks = selected === 'full' ? [] : [{ name: 'device-e2e', reason: 'デバイス差分は公開前のcheck:gateで実行' }];
const result = { schemaVersion: 1, name: 'wake7-check-profile-result', generatedAt: new Date().toISOString(), sourceRevision, status, warnings: status === 'incomplete' ? ['未実行またはfull gate未完了'] : releasePending ? ['milestone成功。release前にfull gateが必要'] : [], errors: failed.map(item => item.name), profile: selected, sessionPhase: requestedPhase, changedFiles: files, ignoredFiles, fullGateRequired, releasePending, selectionReasons: reasons, requiredChecks, executed: executed.map(item => ({ name: item.name, command: item.command || `check:gate → ${item.name}`, startedAt: item.startedAt || null, finishedAt: item.finishedAt || null, durationMs: item.durationMs || 0, exitCode: item.exitCode ?? 1, passed: item.passed ?? item.exitCode === 0 })), unexecuted, skippedChecks, summary: { required: requiredChecks.length, executed: executed.length, unexecuted: unexecuted.length, skipped: skippedChecks.length, failed: failed.length, durationMs: executed.reduce((total, item) => total + (item.durationMs || 0), 0) }, policy: { passed: '必須検査をすべて実行し、全件成功', incomplete: '未実行またはfull gate未完了のため成功扱いにしない', failed: '実行済み検査に失敗がある', milestone: '途中確認の成功。releasePendingなら最終full gateは未完了', fullGateRequiredReason: config.policy?.fullGateRequired?.reason || null } };
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'check-profile-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Check profile ${selected}: ${result.status}. ${result.summary.executed}/${result.summary.required} executed. Report: build/report/check-profile-result.json`);
if (result.status === 'passed') {
  const phase = requestedPhase || (selected === 'full' ? CHANGE_SESSION_PHASES.release
    : selected === 'affected' ? CHANGE_SESSION_PHASES.milestone
      : CHANGE_SESSION_PHASES.editing);
  await recordChangeSessionCheck(root, {
    phase,
    profile: selected,
    command: `check:${selected}`,
    checks: requiredChecks
  });
}
if (result.status !== 'passed') process.exitCode = 1;
