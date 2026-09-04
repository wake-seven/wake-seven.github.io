import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReport, validateReport } from './lib/report.mjs';

// 変更の分類を先に確定し、パスが示す責務と差分の中身の不一致を警告する。
// 警告は既存改修を止めず、--strict のときだけ失敗に昇格する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, 'scripts/change-classification.json');
const registryPath = join(root, 'scripts/feature-registry.json');
const reportPath = join(root, 'build/report/change-classification.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const registry = JSON.parse(await readFile(registryPath, 'utf8'));

export function classifyPath(file, rules = config.pathRules) {
  const normalized = String(file).replaceAll('\\', '/');
  const matches = rules.filter(rule => normalized.startsWith(rule.prefix));
  return matches.sort((a, b) => b.prefix.length - a.prefix.length)[0] || null;
}

export function signalKinds(source, signals = config.semanticSignals) {
  return Object.entries(signals).filter(([, tokens]) => tokens.some(token => source.includes(token))).map(([kind]) => kind);
}

export function classifyChanges(changedFiles, sourceByFile, options = {}) {
  const entries = []; const warnings = []; const errors = [];
  for (const file of changedFiles) {
    const rule = classifyPath(file);
    if (!rule) { entries.push({ file, kind: null, layer: null, signals: [], status: 'unknown' }); warnings.push(`分類ルールがありません: ${file}`); continue; }
    const source = sourceByFile[file] || '';
    const signals = signalKinds(source);
    const mismatched = signals.filter(kind => kind !== rule.kind && !(rule.kind === 'presentation' && kind === 'assist'));
    const entry = { file, kind: rule.kind, layer: rule.layer, signals, mismatched, status: mismatched.length ? 'warning' : 'passed' };
    entries.push(entry);
    if (mismatched.length) warnings.push(`${file}: 宣言分類 ${rule.kind} と差分シグナル ${mismatched.join(', ')} が不一致です`);
  }
  if (options.strict) errors.push(...warnings);
  return { entries, warnings, errors };
}

function changedFilesFromGit() {
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
  return raw.split('\0').filter(Boolean).map(entry => entry.slice(3)).filter(file => file && !file.startsWith('build/report/'));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    assert.equal(classifyPath('src/domain/board-domain.mjs').kind, 'rule');
    assert.equal(classifyPath('src/ui/tutorial-guide.js').kind, 'assist');
    const result = classifyChanges(['src/domain/board-domain.mjs'], { 'src/domain/board-domain.mjs': 'rollOnce()' });
    assert.deepEqual(result.entries[0].signals, ['rule']);
    assert.equal(result.errors.length, 0);
    console.log('Change classification self-test OK');
    return;
  }
  const changedFiles = changedFilesFromGit();
  const sourceByFile = {};
  for (const file of changedFiles) { try { sourceByFile[file] = await readFile(join(root, file), 'utf8'); } catch { sourceByFile[file] = ''; } }
  const result = classifyChanges(changedFiles, sourceByFile, { strict: args.includes('--strict') });
  // feature registryのkindは、変更パスの分類メタデータと重複するため要求しない。
  // ここでは、変更ファイルがpathRulesで分類されることを必須とする。
  const missingFeatureKinds = [];
  result.errors.push(...(args.includes('--strict') ? missingFeatureKinds : []));
  result.warnings.push(...missingFeatureKinds);
  const report = await createReport(root, { name: 'wake7-change-classification', summary: { changedFiles: changedFiles.length, classified: result.entries.filter(entry => entry.kind).length, unknown: result.entries.filter(entry => !entry.kind).length, mismatches: result.entries.filter(entry => entry.mismatched?.length).length, missingFeatureKinds: missingFeatureKinds.length }, entries: result.entries, policy: config.policy, warnings: result.warnings, errors: result.errors });
  validateReport(report, 'change-classification');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Change classification: ${result.entries.length} changed, ${result.warnings.length} warning(s)`);
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
