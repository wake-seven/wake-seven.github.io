import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { publishedSourceFiles } from './application-manifest.mjs';

// 公開版のソースを機械的に検索し、処理の入口を辿るための索引を生成する。
// 完全なJavaScript AST解析ではなく、依存を増やさないための保守用インデックス。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const sources = await Promise.all(publishedSourceFiles.map(async file => ({
  file,
  text: await readFile(join(root, 'src', file), 'utf8')
})));
const runtimeSource = sources.find(source => source.file === 'runtime/runtime.js')?.text || '';
const appVersion = runtimeSource.match(/\bAPP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1] || 'unknown';
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const clean = value => value.replace(/\s+/g, ' ').trim();
const definitions = new Map();
const definitionOffsets = new Set();
const occurrences = new Map();
const addOccurrence = (name, item) => {
  if (!occurrences.has(name)) occurrences.set(name, []);
  occurrences.get(name).push(item);
};

function enclosingFunction(text, offset) {
  const before = text.slice(0, offset);
  const matches = [...before.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>)/g)];
  return matches.length ? (matches.at(-1)[1] || matches.at(-1)[2]) : null;
}
function record(file, text, name, offset, kind) {
  definitionOffsets.add(`${file}:${offset}`);
  const item = { file, line: lineOf(text, offset), kind };
  if (!definitions.has(name)) definitions.set(name, { name, ...item });
  addOccurrence(name, item);
}
for (const { file, text } of sources) {
  const defRe = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=|\bclass\s+([A-Za-z_$][\w$]*)\b/g;
  let match;
  while ((match = defRe.exec(text))) record(file, text, match[1] || match[2] || match[3], match.index, match[1] ? 'function' : match[3] ? 'class' : 'constant');
}

const allNames = [...definitions.keys()].sort((a, b) => b.length - a.length);
const callSites = new Map();
for (const { file, text } of sources) {
  for (const name of allNames) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*\\(`, 'g');
    let match;
    while ((match = re.exec(text))) {
      if (definitionOffsets.has(`${file}:${match.index}`)) continue;
      const caller = enclosingFunction(text, match.index);
      if (!callSites.has(name)) callSites.set(name, []);
      const site = { file, line: lineOf(text, match.index), caller };
      if (!callSites.get(name).some(item => item.file === site.file && item.line === site.line)) callSites.get(name).push(site);
    }
  }
}

const domUpdates = [];
const events = [];
const dialogEdges = [];
for (const { file, text } of sources) {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    for (const match of line.matchAll(/(?:getElementById\(\s*['"]([^'"]+)['"]\s*\)|\$\(\s*['"]([^'"]+)['"]\s*\)|querySelector(?:All)?\(\s*['"]#([^'" ]+))/g)) {
      const id = match[1] || match[2] || match[3];
      domUpdates.push({ id, file, line: lineNumber, updater: enclosingFunction(text, text.indexOf(line) + match.index) });
    }
    for (const match of line.matchAll(/(?:getElementById\(\s*['"]([^'"]+)['"]\s*\)|\$\(\s*['"]([^'"]+)['"]\s*\))[^;]*?\.addEventListener\(\s*['"]([^'"]+)['"]/g)) {
      events.push({ id: match[1] || match[2], type: match[3], file, line: lineNumber, handler: enclosingFunction(text, text.indexOf(line) + match.index) });
    }
    for (const match of line.matchAll(/\b(showMasterDialog|openChainedDialog|openMessageDialog|showClearDialog|open[A-Za-z]*Dialog)\(\s*['"]([^'"]+)['"]/g)) {
      dialogEdges.push({ from: enclosingFunction(text, text.indexOf(line) + match.index) || 'top-level', action: match[1], to: match[2], file, line: lineNumber });
    }
  });
}
const symbolIndex = {
  generatedForVersion: appVersion,
  source: 'scripts/application-manifest.mjs:publishedSourceFiles',
  definitions: Object.fromEntries([...definitions].map(([name, definition]) => [name, {
    ...definition,
    callers: callSites.get(name) || []
  }])),
  dom: Object.fromEntries([...new Set(domUpdates.map(item => item.id))].sort().map(id => [id, domUpdates.filter(item => item.id === id)])),
  events
};
const flowMap = {
  generatedForVersion: symbolIndex.generatedForVersion,
  source: symbolIndex.source,
  eventToCommand: events.map(event => ({ ...event, command: event.handler || 'inline-handler' })),
  dialogTransitions: dialogEdges,
  entryPoints: ['DOMContentLoaded', 'pointerdown', 'click', 'touchstart'].map(type => ({ type, files: sources.filter(({ text }) => text.includes(type)).map(({ file }) => file) }))
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'symbol-index.json'), JSON.stringify(symbolIndex, null, 2) + '\n');
await writeFile(join(reportDir, 'flow-map.json'), JSON.stringify(flowMap, null, 2) + '\n');
console.log(`Generated trace reports: ${relative(root, join(reportDir, 'symbol-index.json'))}, ${relative(root, join(reportDir, 'flow-map.json'))}`);
