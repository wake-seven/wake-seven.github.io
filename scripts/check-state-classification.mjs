import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_CATEGORIES } from './state-classification.mjs';

// 分類の漏れ・重複を検査し、前回baselineとの差分を必ずレポートに残す。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const report = JSON.parse(await readFile(join(root, 'build/report/state-classification.json'), 'utf8'));
assert.deepEqual(report.categories, STATE_CATEGORIES, 'State category list is inconsistent.');
assert.equal(report.missing.length, 0, `Unclassified mutable state: ${report.missing.map(item => `${item.file}:${item.line}:${item.name}`).join(', ')}`);
assert.equal(report.overlaps.length, 0, 'A mutable state declaration has multiple categories.');
assert.equal(report.duplicateNames.length, 0, 'Mutable state names must be unique in the published source.');
assert.equal(Object.values(report.counts).reduce((sum, count) => sum + count, 0), report.states.length, 'State classification counts do not cover all declarations.');
assert.ok(report.delta === null || typeof report.delta === 'object', 'State classification baseline delta is invalid.');
console.log(`State classification OK: ${report.states.length} declarations across ${STATE_CATEGORIES.length} categories.`);
