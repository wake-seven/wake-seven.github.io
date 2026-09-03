// progression 周辺の責務を、現在のシンボル索引から自動分類する。
// 手書きの関数一覧を持たず、生成物を解析の入口として使えるようにする。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const indexPath = join(reportDir, 'symbol-index.json');
const symbolIndex = JSON.parse(await readFile(indexPath, 'utf8'));
const targetFiles = /(?:^|\/)(?:progression[^/]*|clear-flow|master-dialog|rank)\.(?:js|mjs)$/i;
const symbols = Object.values(symbolIndex.definitions || {}).filter(symbol => targetFiles.test(symbol.file || ''));

const rules = [
  ['clear-flow', /clear|complete|finish|solved|reward|celebrat|transition/i],
  ['dialog', /dialog|message|intro|welcome|milestone|tip|quiz/i],
  ['stage-picker', /picker|stage|volume|section|round|chapter/i],
  ['navigation', /navigate|route|return|advance|start|open|close|back|next|menu|select/i],
  ['rank', /rank|title|master|名人|称号/i],
  ['render', /render|paint|view|badge|label|text|html|template|display/i],
  ['state', /state|storage|persist|unlock|cleared|lap|variant|mode|session|progress/i]
];

// 責務名とは別に、調査時に追う順番を示す。これは実行時の制御ではなく、
// 「入口→状態判定→遷移決定→表示更新」の縦の流れをレポートに固定するための分類。
const flowRules = [
  ['entry', /^(?:ProgressionEntryPoints|GameNavigation|GameDialogs|WakeSevenProgressionCommands)$/i],
  ['state-decision', /(?:can|should|resolve|derive|normalize|is[A-Z]|has[A-Z]|current|next|previous|unlock|clear(?:ed)?|progress|policy|context)/i],
  ['transition', /(?:advance|start|finish|complete|load|open|close|return|navigate|select|route|dispatch|restore|reset)/i],
  ['render', /(?:render|paint|show|hide|update|display|dialog|message|quiz|hint|title|rank|badge|label)/i]
];

function flowRoles(symbol) {
  const text = `${symbol.name} ${symbol.file}`;
  if (/^(?:ProgressionEntryPoints|GameNavigation|GameDialogs|WakeSevenProgressionCommands)$/.test(symbol.name)) return ['entry'];
  const roles = flowRules.filter(([, pattern]) => pattern.test(text)).map(([role]) => role);
  if (roles.includes('entry')) return ['entry'];
  return [...new Set(roles.length ? roles : ['unclassified'])];
}

function classify(symbol) {
  const text = `${symbol.name} ${symbol.file}`;
  // ファイルの責務を優先し、関数名に複数の語がある場合は入口の役割を安定させる。
  if (/progression-policy|progression-runtime|game-state/i.test(symbol.file)) return 'state';
  if (/master-dialog|progression-dialogs/i.test(symbol.file)) return 'dialog';
  if (/progression-clear-flow|clear-flow/i.test(symbol.file)) return 'clear-flow';
  if (/progression-render|progression-hud|progression-hints/i.test(symbol.file)) return 'render';
  if (/rank/i.test(symbol.file)) return 'rank';
  for (const [role, pattern] of rules) if (pattern.test(text)) return role;
  return 'unclassified';
}

const entries = symbols
  .sort((a, b) => String(a.file).localeCompare(String(b.file)) || Number(a.line || 0) - Number(b.line || 0) || String(a.name).localeCompare(String(b.name)))
  .map(symbol => ({
    name: symbol.name,
    file: symbol.file,
    line: symbol.line,
    kind: symbol.kind,
    responsibility: classify(symbol),
    flowRoles: flowRoles(symbol),
    mixedResponsibility: flowRoles(symbol).length > 1,
    callers: (symbol.callers || []).filter(caller => caller.caller).map(caller => `${caller.file}:${caller.line}:${caller.caller}`)
  }));
const counts = Object.fromEntries([...new Set(entries.map(entry => entry.responsibility))].sort().map(role => [role, entries.filter(entry => entry.responsibility === role).length]));
const flowCounts = Object.fromEntries([...new Set(entries.flatMap(entry => entry.flowRoles))].sort().map(role => [role, entries.filter(entry => entry.flowRoles.includes(role)).length]));
const fileSummary = Object.values(entries.reduce((summary, entry) => {
  const item = summary[entry.file] ||= { file: entry.file, symbols: 0, responsibilities: new Set(), flowRoles: new Set(), mixedSymbols: 0 };
  item.symbols++;
  item.responsibilities.add(entry.responsibility);
  entry.flowRoles.forEach(role => item.flowRoles.add(role));
  if (entry.mixedResponsibility) item.mixedSymbols++;
  return summary;
}, {})).map(item => ({ ...item, responsibilities: [...item.responsibilities].sort(), flowRoles: [...item.flowRoles].sort() })).sort((a, b) => a.file.localeCompare(b.file));
const report = {
  generatedAt: new Date().toISOString(),
  source: 'build/report/symbol-index.json',
  target: 'progression-related symbols',
  summary: { symbols: entries.length, files: new Set(entries.map(entry => entry.file)).size, responsibilities: counts, flowRoles: flowCounts, mixedSymbols: entries.filter(entry => entry.mixedResponsibility).length, unclassifiedSymbols: entries.filter(entry => entry.responsibility === 'unclassified').length },
  pipeline: ['entry', 'state-decision', 'transition', 'render'],
  fileSummary,
  entries,
  note: '責務は関数名・ファイル名からの監査用分類。移動・削除・統合を自動実行しない。'
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'progression-responsibility.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated progression responsibility report: ${entries.length} symbols.`);
