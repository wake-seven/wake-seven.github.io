import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const uiRoot = join(root, 'src', 'ui');
const architectureDoc = await readFile(join(root, 'docs', 'architecture-audit.md'), 'utf8');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

assert.match(architectureDoc, /## 大規模な構造変更の停止基準/,
  'Architecture guidance must define a stop policy for large refactors.');
assert.equal(packageJson.scripts['check:browser-e2e'], 'node scripts/check-browser-e2e.mjs',
  'Browser E2E command must remain available before structural changes.');
await access(join(root, 'scripts', 'check-browser-e2e.mjs'), constants.F_OK);

const uiEntries = await readdir(uiRoot, { withFileTypes: true });
const shardedNames = uiEntries
  .filter(entry => entry.isFile() && /^progression-(?:part|chunk)-\d+\.js$/.test(entry.name))
  .map(entry => entry.name);
assert.deepEqual(shardedNames, [],
  `Do not create numbered progression shards without a documented responsibility: ${shardedNames.join(', ')}`);

const progressionUi = await readFile(join(uiRoot, 'progression-ui.js'), 'utf8');
const lines = progressionUi.split('\n').length;
const progressionUiLineBudget = 1120;
assert.ok(lines <= progressionUiLineBudget,
  `progression-ui.js が責務整理の予算(${progressionUiLineBudget}行)を超えています: ${lines}行。新しい処理は既存の入口・担当ファイルへ寄せてください。`);
if (lines > 1080) console.warn(`progression-ui.js は ${lines} 行です。新しい責務を追加せず、既存入口への統合を優先してください。`);
const responsibilityReport = JSON.parse(await readFile(join(root, 'build', 'report', 'progression-responsibility.json'), 'utf8'));
assert.ok(responsibilityReport.pipeline?.join('>') === 'entry>state-decision>transition>render',
  'progression責務レポートに標準追跡パイプラインがありません');
assert.equal(responsibilityReport.summary.unclassifiedSymbols, 0,
  'progression責務に未分類シンボルがあります。責務ルールを更新してから変更してください');
console.log(`Refactor policy audited: browser E2E present; progression-ui.js=${lines} lines.`);
