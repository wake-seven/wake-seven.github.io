import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ベースラインが比較可能な形式で生成されていることだけを検査する。
// 件数そのものに上限を設けず、リファクタリングで減ったか増えたかを追跡する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(await readFile(join(root, 'build/report/refactor-baseline.json'), 'utf8'));
assert.equal(report.schemaVersion, 1, 'refactor baseline schemaVersion is invalid');
assert.ok(report.generatedAt, 'refactor baseline generatedAt is missing');
assert.ok(report.summary && Number.isInteger(report.summary.mutableVariableCount), 'mutable variable summary is missing');
assert.ok(Array.isArray(report.mutableVariables), 'mutableVariables is missing');
assert.ok(Array.isArray(report.mutableReferences), 'mutableReferences is missing');
assert.ok(report.progression && Array.isArray(report.progression.definitions), 'progression definitions are missing');
assert.ok(Array.isArray(report.progression.entries), 'progression entries are missing');
assert.ok(report.e2e && Number.isInteger(report.e2e.caseCount), 'E2E baseline is missing');
assert.equal(report.summary.mutableVariableCount, report.mutableVariables.length, 'mutable variable count mismatch');
assert.equal(report.summary.progressionFunctionCount, report.progression.definitions.length, 'progression function count mismatch');
assert.equal(report.summary.e2eCaseCount, report.e2e.caseCount, 'E2E case count mismatch');
console.log(`Refactor baseline OK: ${report.summary.mutableVariableCount} mutable variables, ${report.summary.progressionFunctionCount} progression functions, ${report.summary.e2eCaseCount} E2E cases.`);
