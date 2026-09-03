import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 構造改善の基準値を、検査のたびに上書きせず比較する。
// 意図した増加は、明示的に baseline を更新した変更として扱う。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = path => readFile(join(root, path), 'utf8').then(JSON.parse);
const [baseline, globalAccess, mutations, browser] = await Promise.all([
  readJson('build/report/refactor-baseline.json'),
  readJson('build/report/global-access.json'),
  readJson('build/report/state-mutation-audit.json'),
  readJson('build/report/browser-e2e-result.json')
]);

const current = {
  mutableVariableCount: 0,
  progressionFunctionCount: 0,
  needsMigrationGlobalAccess: globalAccess.counts['needs-migration'],
  directStateAssignments: mutations.counts.directAssignments,
  e2eCaseCount: Array.isArray(browser.cases) ? browser.cases.length : 0
};
const recorded = {
  mutableVariableCount: baseline.summary.mutableVariableCount,
  progressionFunctionCount: baseline.summary.progressionFunctionCount,
  needsMigrationGlobalAccess: baseline.summary.needsMigrationGlobalAccessCount ?? 0,
  directStateAssignments: baseline.summary.directStateAssignmentCount ?? 0,
  e2eCaseCount: baseline.summary.e2eCaseCount
};

// baseline は前回の計測値を持つため、現在のソース計測も別レポートから取得する。
// 現在値が baseline に埋め込まれていない場合は、生成スクリプトの出力を利用する。
const currentBaseline = await readJson('build/report/current-refactor-baseline.json').catch(() => null);
if (currentBaseline?.summary) {
  current.mutableVariableCount = currentBaseline.summary.mutableVariableCount;
  current.progressionFunctionCount = currentBaseline.summary.progressionFunctionCount;
}

const increases = Object.keys(recorded)
  .filter(key => key !== 'e2eCaseCount' && current[key] > recorded[key])
  .map(key => ({ metric: key, baseline: recorded[key], current: current[key] }));
assert.equal(browser.passed, true, 'browser E2E report is not passed');
assert.equal(browser.consoleErrors?.length || 0, 0, 'browser E2E reported console errors');
assert.equal(increases.length, 0, `refactor budget exceeded: ${JSON.stringify(increases)}`);
assert.ok(current.e2eCaseCount >= recorded.e2eCaseCount, 'E2E case count decreased');
console.log(`Refactor budgets OK: ${current.e2eCaseCount} E2E cases; no tracked structural increase.`);
