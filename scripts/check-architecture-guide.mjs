import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceRevision } from './lib/report.mjs';

// アーキテクチャ案内が、実在する入口と責務境界だけを参照しているか確認する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const guidePath = join(root, 'docs', 'architecture-guide.md');
const reportPath = join(root, 'build', 'report', 'architecture-guide.json');
const guide = await readFile(guidePath, 'utf8');

assert.match(guide, /^# 現行アーキテクチャ案内/m, 'architecture-guide.mdの見出しが不正です');
for (const required of [
  'scripts/application-manifest.mjs', 'src/main.mjs', 'src/domain/', 'src/data/', 'src/state/',
  'src/commands/', 'src/ui/', 'src/runtime/', 'npm run check:gate', 'npm run trace:entry'
]) assert.ok(guide.includes(required), `案内に必須の入口がありません: ${required}`);

const references = [...guide.matchAll(/`((?:src|scripts)\/[^`\s]+)`/g)]
  .map(match => match[1]).filter(reference => !/[?*{}]/.test(reference));
const missing = [];
for (const reference of [...new Set(references)]) {
  const normalized = reference.endsWith('/') ? reference.slice(0, -1) : reference;
  try { await access(join(root, normalized), constants.F_OK); }
  catch { missing.push(reference); }
}
assert.deepEqual(missing, [], `案内が存在しないパスを参照しています: ${missing.join(', ')}`);

const report = {
  schemaVersion: 1,
  name: 'wake7-architecture-guide',
  generatedAt: new Date().toISOString(),
  guide: 'docs/architecture-guide.md',
  references: [...new Set(references)],
  missing,
  passed: true,
  status: 'passed',
  summary: { references: [...new Set(references)].length },
  warnings: [],
  errors: [],
  sourceRevision: await sourceRevision(root)
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Architecture guide OK: ${report.references.length} path references. Report: ${relative(root, reportPath)}`);
