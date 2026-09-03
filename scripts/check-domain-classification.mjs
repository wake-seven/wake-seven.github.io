import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 検査スクリプトを、利用者向けの4領域へ分類する監査。
// 既存の検査は実行せず、分類の漏れ・重複・未知の領域だけを検出する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(root, 'package.json');
const manifestPath = join(root, 'scripts', 'check-domains.json');
const reportPath = join(root, 'build', 'report', 'check-domain-classification.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const allowedDomains = new Set(['structure', 'state', 'flows', 'browser']);
const excluded = new Set(manifest.excluded || []);
const entries = manifest.checks || [];
const expected = Object.keys(packageJson.scripts || {})
  .filter(name => name.startsWith('check:') && !excluded.has(name));
const errors = [];
const warnings = [];
const byName = new Map();

for (const entry of entries) {
  if (!entry || typeof entry.name !== 'string') {
    errors.push('各分類エントリには name が必要です。');
    continue;
  }
  if (byName.has(entry.name)) errors.push(`分類が重複しています: ${entry.name}`);
  byName.set(entry.name, entry);
  if (!allowedDomains.has(entry.domain)) errors.push(`未知の領域です: ${entry.name} -> ${entry.domain}`);
  if (!packageJson.scripts[entry.name]) errors.push(`package.json に存在しない検査です: ${entry.name}`);
}

for (const name of expected) if (!byName.has(name)) errors.push(`分類がありません: ${name}`);
for (const name of byName.keys()) if (!expected.includes(name)) warnings.push(`分類対象外として登録されています: ${name}`);
for (const name of excluded) {
  if (!packageJson.scripts[name]) errors.push(`除外指定された検査が package.json にありません: ${name}`);
  if (byName.has(name)) errors.push(`除外指定と分類が重複しています: ${name}`);
}

const counts = Object.fromEntries([...allowedDomains].map(domain => [domain, entries.filter(entry => entry.domain === domain).length]));
const report = {
  schemaVersion: 1,
  name: 'wake7-check-domain-classification',
  generatedAt: new Date().toISOString(),
  domains: [...allowedDomains],
  expectedCheckCount: expected.length,
  classifiedCheckCount: entries.length,
  counts,
  excluded: [...excluded],
  errors,
  warnings,
  passed: errors.length === 0
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`Report: ${relative(root, reportPath)}`);
  process.exitCode = 1;
} else {
  console.log(`Check domain classification OK: ${entries.length} checks across ${allowedDomains.size} domains`);
  console.log(`Report: ${relative(root, reportPath)}`);
}
