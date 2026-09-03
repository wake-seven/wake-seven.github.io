import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 構造変更前後を比較するための、現状の解析ベースラインを生成する。
// 完全なJavaScript AST解析ではなく、依存を増やさない保守用の計測である。
// このスクリプトはソースを変更せず、build/report/refactor-baseline.jsonだけを書き換える。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const readReport = async name => {
  try { return JSON.parse(await readFile(join(reportDir, name), 'utf8')); }
  catch { return null; }
};
const sources = await Promise.all(publishedSourceFiles.map(async file => ({
  file,
  text: await readFile(join(root, 'src', file), 'utf8')
})));
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const functionAt = (text, offset) => {
  const before = text.slice(0, offset);
  const matches = [...before.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^>]*?\)?\s*=>)/g)];
  return matches.length ? (matches.at(-1)[1] || matches.at(-1)[2]) : null;
};

const mutable = [];
const references = [];
for (const { file, text } of sources) {
  for (const match of text.matchAll(/\b(let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    mutable.push({ name: match[2], declaration: match[1], file, line: lineOf(text, match.index), function: functionAt(text, match.index) });
  }
  const names = [...new Set(mutable.filter(item => item.file === file).map(item => item.name))];
  for (const name of names) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'g');
    for (const match of text.matchAll(re)) {
      const line = lineOf(text, match.index);
      const before = text.slice(Math.max(0, match.index - 90), match.index);
      const after = text.slice(match.index + name.length, match.index + name.length + 20);
      const isDeclaration = new RegExp(`\\b(?:let|var)\\s+${name}\\b`).test(before + name);
      if (isDeclaration) continue;
      const isWrite = /(?:^|[;,(\s])(?:\+\+|--)?\s*$/.test(before) && /^(?:\s*(?:[-+*/%]?=|\+\+|--))/.test(after);
      references.push({ name, file, line, access: isWrite ? 'write' : 'read', function: functionAt(text, match.index) });
    }
  }
}
const uniqueMutable = [...new Map(mutable.map(item => [`${item.file}:${item.line}:${item.name}`, item])).values()];
const uniqueReferences = [...new Map(references.map(item => [`${item.file}:${item.line}:${item.name}:${item.access}`, item])).values()];

const symbolIndex = await readReport('symbol-index.json');
const flowMap = await readReport('flow-map.json');
const progressionFiles = new Set(publishedSourceFiles.filter(file => /progression|clear-flow|master-dialog|(?:^|\/)rank\.js$|(?:^|\/)message\.js$/.test(file)));
const progressionDefinitions = Object.values(symbolIndex?.definitions || {})
  .filter(symbol => progressionFiles.has(symbol.file))
  .map(symbol => ({ name: symbol.name, file: symbol.file, line: symbol.line, callers: symbol.callers || [] }));
const progressionEntries = (flowMap?.progressionEntries || []).map(entry => ({
  name: entry.name,
  implementation: entry.implementation,
  role: entry.role,
  definition: entry.definition,
  callers: entry.callers || [],
  entryWrapper: entry.entryWrapper || []
}));
const browser = await readReport('browser-e2e-result.json');
const e2e = browser ? {
  name: browser.name,
  appVersion: browser.appVersion,
  gitSha: browser.gitSha,
  passed: browser.passed === true,
  caseCount: Array.isArray(browser.cases) ? browser.cases.length : 0,
  consoleErrorCount: Array.isArray(browser.consoleErrors) ? browser.consoleErrors.length : 0,
  cases: (browser.cases || []).map(item => item.name)
} : { passed: false, caseCount: 0, consoleErrorCount: 0, cases: [], unavailable: true };

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'scripts/application-manifest.mjs:publishedSourceFiles',
  purpose: 'グローバル可変状態・progression責務・入口経路・ブラウザ検証の比較用ベースライン',
  method: '依存を増やさない正規表現ベースの静的計測。判定ではなく比較材料として利用する。',
  summary: {
    publishedFileCount: sources.length,
    mutableVariableCount: uniqueMutable.length,
    mutableReferenceCount: uniqueReferences.length,
    mutableReadCount: uniqueReferences.filter(item => item.access === 'read').length,
    mutableWriteCount: uniqueReferences.filter(item => item.access === 'write').length,
    progressionFunctionCount: progressionDefinitions.length,
    progressionEntryCount: progressionEntries.length,
    e2eCaseCount: e2e.caseCount,
    e2ePassed: e2e.passed,
    e2eConsoleErrorCount: e2e.consoleErrorCount
  },
  mutableVariables: uniqueMutable,
  mutableReferences: uniqueReferences,
  progression: { definitions: progressionDefinitions, entries: progressionEntries },
  e2e
};
await mkdir(reportDir, { recursive: true });
const reportPath = join(reportDir, 'refactor-baseline.json');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Refactor baseline: ${report.summary.mutableVariableCount} mutable variables, ${report.summary.progressionFunctionCount} progression functions, ${report.summary.e2eCaseCount} E2E cases.`);
console.log(`Report: ${relative(root, reportPath)}`);
