// 参照グラフを使って、統合候補を機械的に可視化する。
// 判定は自動化せず、構造変更の前に人間が確認できる材料だけを生成する。
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReport } from './lib/report.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const symbolIndex = JSON.parse(await readFile(join(reportDir, 'symbol-index.json'), 'utf8'));
const flowMap = JSON.parse(await readFile(join(reportDir, 'flow-map.json'), 'utf8'));
const symbols = Object.values(symbolIndex.definitions || symbolIndex.symbols || symbolIndex);
const files = new Map();
const roleFor = file => {
  const top = file.split('/')[0];
  return {
    app: '起動・共有コンテキスト',
    commands: '状態変更の入口',
    data: '出題・文言データ',
    domain: '盤面・進行ルール',
    runtime: 'ブラウザAPI・時間・保存・音',
    state: '状態と永続化',
    ui: 'DOM描画・入力・ダイアログ'
  }[top] || '未分類';
};
for (const symbol of symbols) {
  const file = symbol.file || symbol.path;
  if (!file) continue;
  const entry = files.get(file) || { file, role: roleFor(file), symbols: 0, callers: 0, callees: 0, lines: 0 };
  entry.symbols++;
  entry.callers += Array.isArray(symbol.callers) ? symbol.callers.length : 0;
  entry.callees += Array.isArray(symbol.callees) ? symbol.callees.length : 0;
  entry.lines += Number(symbol.endLine || symbol.line || 0) - Number(symbol.startLine || symbol.line || 0) + 1;
  files.set(file, entry);
}
const candidates = [...files.values()]
  .filter(entry => entry.lines <= 120 && entry.symbols <= 8 && entry.callers + entry.callees <= 12)
  .sort((a, b) => a.lines - b.lines || a.file.localeCompare(b.file));
const classifications = candidates.map(entry => ({
  ...entry,
  classification: entry.lines <= 30 && entry.symbols <= 3 ? 'thin-wrapper-or-boundary' : 'small-module',
  action: entry.callers === 0 && entry.callees === 0 ? 'verify-manifest-before-removal' : 'review-for-integration'
}));
const report = {
  generatedAt: new Date().toISOString(),
  source: ['build/report/symbol-index.json', 'build/report/flow-map.json'],
  summary: { files: files.size, candidates: candidates.length, classifications: classifications.length },
  candidates: classifications,
  note: '候補は計測結果であり、自動削除・自動統合の指示ではない。'
};
await mkdir(reportDir, { recursive: true });
await writeReport(join(reportDir, 'refactor-candidates.json'), report);
console.log(`Generated refactor candidate report: ${candidates.length} candidates.`);
