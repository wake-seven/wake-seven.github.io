import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// check:gate が直近に計測した区分別時間を、人が確認しやすい形で検査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(await readFile(join(root, 'build/report/check-runtime.json'), 'utf8'));
assert.equal(report.name, 'wake7-check-runtime', 'check-runtime.json が不正です。先に npm run check:gate を実行してください。');
for (const [profile, value] of Object.entries(report.profiles || {})) {
  assert.equal(value.withinBudget, true, `${profile} の時間予算を超過しています: ${value.durationMs}ms / ${value.budgetMs}ms`);
}
const total = Object.values(report.profiles || {}).reduce((sum, value) => sum + value.durationMs, 0);
console.log(`Runtime budgets OK: ${total}ms total; ${Object.keys(report.profiles || {}).length} profiles.`);
