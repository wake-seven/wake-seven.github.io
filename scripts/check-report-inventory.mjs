import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceRevision, writeReport } from './lib/report.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const configPath = join(root, 'scripts', 'report-inventory.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const errors = [];
const warnings = [];
const classifications = new Set(config.classifications || []);
const lists = config.reports || {};
const entries = [];
for (const [classification, files] of Object.entries(lists)) {
  if (!classifications.has(classification)) errors.push(`未知の成果物分類です: ${classification}`);
  for (const file of files || []) entries.push({ file, classification });
}
const byFile = new Map();
for (const entry of entries) {
  if (!entry.file.endsWith('.json')) errors.push(`JSONでない成果物が登録されています: ${entry.file}`);
  if (byFile.has(entry.file)) errors.push(`成果物分類が重複しています: ${entry.file}`);
  byFile.set(entry.file, entry.classification);
}
const actual = (await readdir(reportDir)).filter(file => file.endsWith('.json')).sort();
const unknown = actual.filter(file => !byFile.has(file));
// この監査自身の出力は、監査開始時点ではまだ存在しないため欠落扱いにしない。
const missing = [...byFile.keys()].filter(file => file !== 'report-inventory.json' && !actual.includes(file));
for (const file of unknown) errors.push(`未知のレポートです: ${file}`);
for (const file of missing) errors.push(`定義済みレポートがありません: ${file}`);
const inventory = {
  schemaVersion: 1, name: 'wake7-report-inventory', generatedAt: new Date().toISOString(),
  sourceRevision: await sourceRevision(root), status: errors.length ? 'failed' : warnings.length ? 'warning' : 'passed',
  summary: { discovered: actual.length, defined: byFile.size, required: lists.required?.length || 0, supporting: lists.supporting?.length || 0, classified: actual.length - unknown.length, unknown: unknown.length, missing: missing.length },
  warnings, errors, policy: config.policy,
  reports: actual.map(file => ({ file: `build/report/${file}`, classification: byFile.get(file) || null })),
  unknownReports: unknown.map(file => `build/report/${file}`),
  missingReports: missing.map(file => `build/report/${file}`),
  // 補助成果物も自動削除せず、棚卸し時点の削除判定を明示してレビュー可能にする。
  deletionCandidates: actual.filter(file => byFile.get(file) === 'supporting').map(file => ({
    file: `build/report/${file}`, decision: 'retain', reason: '補助成果物として追跡・監査の参照先になり得るため、削除は個別レビュー後に行う。'
  }))
};
await writeReport(join(reportDir, 'report-inventory.json'), inventory);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Report inventory OK: ${actual.length} reports (${lists.required?.length || 0} required, ${lists.supporting?.length || 0} supporting)`);
