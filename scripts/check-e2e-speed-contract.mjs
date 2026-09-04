import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// E2Eの実行は行わず、現行レポートが速度化契約のケース集合を満たすかだけを監査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJson = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const contract = await readJson('scripts/e2e-speed-contract.json');
const browser = await readJson(contract.reports.browser);
const device = await readJson(contract.reports.device);
const errors = [];
const validExecution = new Set(['serial', 'parallel-by-context']);
const flatten = cases => Object.entries(cases || {}).flatMap(([classification, names]) => (names || []).map(name => ({ name, classification })));
const browserExpected = flatten(contract.suites.browser.cases);
const browserActual = (browser.cases || []).map(item => item.name);
const deviceExpected = flatten(contract.suites.device.cases);
const deviceActual = (device.contexts || []).flatMap(context => (context.cases || []).map(item => ({ context: context.name, name: item.name })));
const check = (label, expected, actual, key = item => item) => {
  const expectedKeys = expected.map(key); const actualKeys = actual.map(key);
  const duplicates = actualKeys.filter((value, index) => actualKeys.indexOf(value) !== index);
  const missing = expectedKeys.filter(value => !actualKeys.includes(value));
  const unknown = actualKeys.filter(value => !expectedKeys.includes(value));
  if (duplicates.length) errors.push(`${label}: 重複ケース ${[...new Set(duplicates)].join(', ')}`);
  if (missing.length) errors.push(`${label}: 分類漏れ ${missing.join(', ')}`);
  if (unknown.length) errors.push(`${label}: 契約外ケース ${[...new Set(unknown)].join(', ')}`);
};
assert.equal(contract.schemaVersion, 1, 'e2e-speed-contract schemaVersion');
for (const [suite, definition] of Object.entries(contract.suites || {})) {
  if (!validExecution.has(definition.execution)) errors.push(`${suite}: execution は serial または parallel-by-context が必要です`);
  if (definition.execution === 'parallel-by-context' && definition.withinContext !== 'serial') errors.push(`${suite}: parallel-by-context は withinContext=serial が必要です`);
  if (!definition.reason) errors.push(`${suite}: parallel/serial境界の理由がありません`);
}
check('browser', browserExpected.map(value => value.name), browserActual, value => value);
const contexts = new Set((contract.suites.device.contexts || []).map(value => value));
for (const context of deviceActual) if (!contexts.has(context.context)) errors.push(`device: 未定義コンテキスト ${context.context}`);
check('device', deviceExpected.map(value => value.name), [...new Set(deviceActual.map(value => value.name))], value => value);
const expectedContextCases = deviceExpected.map(value => value.name);
for (const context of contexts) {
  const names = deviceActual.filter(value => value.context === context).map(value => value.name);
  check(`device/${context}`, expectedContextCases, names, value => value);
}
if (browser.passed !== true) errors.push('browser-e2e-result: passed=true ではありません');
if (device.passed !== true) errors.push('device-e2e-result: passed=true ではありません');
if ((browser.consoleErrors || []).length || (device.consoleErrors || []).length) errors.push('E2Eレポートにコンソールエラーがあります');
const report = { schemaVersion: 1, name: 'wake7-e2e-speed-contract', generatedAt: new Date().toISOString(), status: errors.length ? 'failed' : 'passed', summary: { browserCases: browserActual.length, deviceContexts: contexts.size, deviceCasesPerContext: deviceExpected.length, errors: errors.length }, execution: Object.fromEntries(Object.entries(contract.suites).map(([name, value]) => [name, { execution: value.execution, withinContext: value.withinContext || null }])), errors, warnings: [] };
const reportPath = join(root, 'build/report/e2e-speed-contract-audit.json');
await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; } else console.log(`E2E speed contract OK: ${browserActual.length} browser cases, ${contexts.size} device contexts × ${deviceExpected.length} cases`);
