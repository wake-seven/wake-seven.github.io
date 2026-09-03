import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 生成済みの追跡索引を、改修時の入口として検索するCLI。
// 例: npm run trace -- clearNext
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const [query, ...options] = process.argv.slice(2);
if (!query || options.includes('--help') || options.includes('-h')) {
  console.log('使い方: npm run trace -- <関数名・DOM ID・イベント名・ダイアログ名>');
  console.log('例: npm run trace -- clearNext');
  process.exit(query ? 0 : 1);
}

const [symbol, flow] = await Promise.all([
  readFile(join(reportDir, 'symbol-index.json'), 'utf8').then(JSON.parse),
  readFile(join(reportDir, 'flow-map.json'), 'utf8').then(JSON.parse)
]);
const needle = query.toLowerCase();
const matches = [];
const add = (category, label, item) => matches.push({ category, label, ...item });

for (const [name, item] of Object.entries(symbol.definitions || {})) {
  if (name.toLowerCase().includes(needle)) {
    add('定義', name, { file: item.file, line: item.line, kind: item.kind });
    for (const caller of item.callers || []) add('呼び出し', name, caller);
  }
}
for (const [id, items] of Object.entries(symbol.dom || {})) {
  if (id.toLowerCase().includes(needle)) for (const item of items) add('DOM', id, item);
}
for (const item of symbol.events || []) {
  const text = `${item.id} ${item.type} ${item.handler || ''}`.toLowerCase();
  if (text.includes(needle)) add('イベント', `${item.id} (${item.type})`, item);
}
for (const item of flow.dialogTransitions || []) {
  const text = `${item.from} ${item.action} ${item.to}`.toLowerCase();
  if (text.includes(needle)) add('ダイアログ遷移', `${item.action} → ${item.to}`, item);
}
for (const item of flow.progressionEntries || []) {
  const text = `${item.name} ${item.implementation} ${item.role}`.toLowerCase();
  if (text.includes(needle)) {
    add('進行入口', `${item.name} → ${item.implementation}`, { role: item.role, ...item.definition });
    for (const caller of item.callers || []) add('入口の呼び出し元', item.name, caller);
  }
}
for (const item of flow.entryPoints || []) {
  if (item.type.toLowerCase().includes(needle)) add('入口', item.type, { files: item.files });
}

const unique = [...new Map(matches.map(item => [JSON.stringify(item), item])).values()];
if (!unique.length) {
  console.log(`追跡結果なし: ${query}`);
  process.exitCode = 1;
} else {
  console.log(`追跡結果: ${query} (${unique.length}件)`);
  for (const item of unique) {
    if (item.file) console.log(`- [${item.category}] ${item.label}: ${item.file}:${item.line}${item.caller ? ` (${item.caller} 内)` : ''}`);
    else if (item.files) console.log(`- [${item.category}] ${item.label}: ${item.files.join(', ') || '(該当ファイルなし)'}`);
  }
}
