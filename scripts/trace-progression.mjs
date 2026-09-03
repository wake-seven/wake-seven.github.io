import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// progressionの外部入口から、実装・状態・DOM・遷移・E2E・公開セクションを横断して表示する。
// 元のtrace/entrypointは汎用検索用、このCLIはprogressionの入口調査用に限定する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const readJson = async name => JSON.parse(await readFile(join(reportDir, name), 'utf8'));
const [flow, symbols, globalAccess, uiData, wiring, manifest] = await Promise.all([
  readJson('flow-map.json'), readJson('symbol-index.json'), readJson('global-access.json'),
  readJson('ui-data-map.json'), readJson('event-wiring-map.json'),
  readFile(join(root, 'scripts', 'application-manifest.mjs'), 'utf8')
]);
const entryName = process.argv.slice(2).find(arg => !arg.startsWith('-'));
const requested = entryName ? [entryName] : ['start', 'complete', 'openDialog', 'advance'];
const entriesByName = new Map((flow.progressionEntries || []).map(entry => [entry.name, entry]));
const aliases = { start: ['startStage'], complete: ['finishStage'], openDialog: ['showProgressionDialog'], advance: ['advanceAfterClear'] };
const sourceFiles = [...manifest.matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
const reportNames = ['browser-e2e-result.json', 'device-e2e-result.json'];
const loadedE2E = await Promise.all(reportNames.map(name => readJson(name).catch(() => ({ cases: [] }))));
const e2eHints = {
  start: ['startup', 'tutorial', 'stage', 'picker'],
  complete: ['clear', 'completion', 'animation'],
  openDialog: ['dialog', 'picker', 'menu', 'rank'],
  advance: ['clear', 'next', 'progression', 'message', 'quiz']
};
const sections = sourceFiles.filter(file => file.startsWith('runtime/') || file.startsWith('commands/') || file.startsWith('ui/'));
const resultEntries = [];
for (const requestedName of requested) {
  const publicName = aliases[requestedName] ? requestedName : requestedName;
  const configuredName = aliases[requestedName]?.[0] || requestedName;
  const entry = entriesByName.get(configuredName) || entriesByName.get(publicName);
  if (!entry) throw new Error(`未知のprogression入口です: ${requestedName}`);
  const definition = entry.definition || null;
  const implementation = entry.implementation;
  const callers = [...(entry.callers || []), ...(entry.entryWrapper || [])];
  const relatedFiles = new Set([definition?.file, ...callers.map(item => item.file)].filter(Boolean));
  const state = globalAccess.references.filter(item => relatedFiles.has(item.file) || item.name === implementation)
    .map(item => ({ name: item.name, file: item.file, line: item.line, access: item.access, classification: item.classification }));
  const dom = uiData.entries.flatMap(item => item.elements || []).filter(item =>
    (item.references || []).some(reference => relatedFiles.has(reference.file) || reference.updater === implementation))
    .map(item => item.id);
  const events = wiring.entries.flatMap(item => item.elements || []).filter(item =>
    (item.events || []).some(event => relatedFiles.has(event.file) || event.handlers?.includes(implementation)))
    .map(item => item.id);
  const transitions = (flow.dialogTransitions || []).filter(item => item.from === implementation || item.from === publicName || String(item.action || '').toLowerCase().includes(publicName.toLowerCase()));
  const hintKeys = e2eHints[requestedName] || e2eHints[publicName] || [];
  const e2eCases = loadedE2E.flatMap((report, reportIndex) => (report.cases || []).filter(test => {
    const testName = typeof test === 'string' ? test : test.name || '';
    return hintKeys.some(hint => testName.toLowerCase().includes(hint));
  }).map(test => ({ report: reportNames[reportIndex], name: typeof test === 'string' ? test : test.name })));
  resultEntries.push({ name: publicName, implementation, role: entry.role, definition, callers, state, domIds: [...new Set(dom)], eventIds: [...new Set(events)], transitions, e2eCases: [...new Map(e2eCases.map(item => [`${item.report}:${item.name}`, item])).values()], generatedSections: sections.filter(file => relatedFiles.has(file) || file.includes('progression')) });
}
const result = { schemaVersion: 1, name: 'wake7-progression-trace', status: 'passed', summary: { entries: resultEntries.length }, warnings: [], errors: [], generatedAt: new Date().toISOString(), sourceRevision: 'working-tree', entries: resultEntries,
  sources: { flow: 'build/report/flow-map.json', symbols: 'build/report/symbol-index.json', globalAccess: 'build/report/global-access.json', uiData: 'build/report/ui-data-map.json', wiring: 'build/report/event-wiring-map.json', e2e: reportNames },
  commands: { search: 'npm run trace -- <関数名・DOM ID・イベント名>', impact: 'npm run trace:impact -- <変更ファイル>' } };
const reportPath = join(reportDir, 'progression-trace.json');
await mkdir(reportDir, { recursive: true });
await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else for (const entry of resultEntries) {
  console.log(`進行入口: ${entry.name} → ${entry.implementation}`);
  console.log(`  定義: ${entry.definition ? `${entry.definition.file}:${entry.definition.line}` : '不明'}`);
  console.log(`  呼び出し元: ${entry.callers.map(item => `${item.file}:${item.line}`).join(', ') || 'なし'}`);
  console.log(`  状態: ${[...new Set(entry.state.map(item => `${item.name}(${item.access})`))].join(', ') || 'なし'}`);
  console.log(`  DOM/イベント: ${entry.domIds.join(', ') || 'なし'} / ${entry.eventIds.join(', ') || 'なし'}`);
  console.log(`  遷移: ${entry.transitions.map(item => `${item.action}→${item.to}`).join(', ') || 'なし'}`);
  console.log(`  E2E: ${entry.e2eCases.length}件 / セクション: ${entry.generatedSections.join(', ') || 'なし'}`);
}
console.log(`追跡レポート: ${relative(root, reportPath)}`);
