import assert from 'node:assert/strict';
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentSourceFiles, publishedSourceFiles } from './application-manifest.mjs';

// 互換層・薄い入口は「参照回数が少ない」だけでは削除しない。
// 公開マニフェスト、開発ESM入口、公開API、検査・E2Eからの参照をまとめて確認し、
// 削除できるものだけを明示的に候補として出す。削除そのものは人間の判断で行う。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const candidateReport = JSON.parse(await readFile(join(reportDir, 'refactor-candidates.json'), 'utf8'));
const published = new Set(publishedSourceFiles);
const development = new Set(developmentSourceFiles);
const reassessOn = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const purposeFor = file => {
  const [area] = file.split('/');
  return {
    app: '起動と共有コンテキスト',
    commands: '状態変更と操作の入口',
    data: '問題・文言・素材データ',
    domain: '盤面と進行ルール',
    runtime: 'ブラウザ環境・保存・音・時間の接続',
    state: '状態と永続化',
    ui: 'DOM描画・入力・ダイアログ'
  }[area] || '現行ソースの補助モジュール';
};

const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (['.js', '.mjs', '.json', '.md'].includes(extname(entry.name))) files.push(path);
  }
}
await collect(join(root, 'src'));
await collect(join(root, 'scripts'));
files.push(join(root, 'package.json'));
const contents = new Map();
for (const path of files) contents.set(relative(root, path).replaceAll('\\', '/'), await readFile(path, 'utf8'));

const classify = candidate => {
  const file = candidate.file;
  const referenceSources = [];
  if (published.has(file)) referenceSources.push('scripts/application-manifest.mjs:publishedSourceFiles');
  if (development.has(file)) referenceSources.push('scripts/application-manifest.mjs:developmentSourceFiles');
  const references = [...contents.entries()]
    .filter(([path, source]) => path !== `src/${file}` && source.includes(file))
    .map(([path]) => path);
  referenceSources.push(...references);
  const retained = published.has(file) || development.has(file) || references.length > 0;
  return {
    disposition: retained ? '保持' : '削除候補',
    reason: retained
      ? (published.has(file) ? '公開マニフェストに含まれる単体index.htmlの構成要素' : 'ソースまたは検査から参照されている')
      : 'マニフェスト・開発入口・検査から参照されていない',
    purpose: purposeFor(file),
    referenceSources: [...new Set(referenceSources)].sort(),
    removalCondition: '公開マニフェスト・開発入口・公開API・検査・E2Eの参照がすべて0であることを確認し、npm run check:gate を通過すること',
    reassessOn
  };
};

const entries = candidateReport.candidates.map(candidate => ({
  file: candidate.file,
  classification: candidate.classification,
  ...classify(candidate)
}));
const safeToDelete = entries.filter(entry => entry.disposition === '削除候補');
for (const entry of entries) {
  assert.ok(entry.purpose, `互換候補の目的がありません: ${entry.file}`);
  assert.ok(Array.isArray(entry.referenceSources), `互換候補の参照元がありません: ${entry.file}`);
  assert.ok(entry.removalCondition, `互換候補の削除条件がありません: ${entry.file}`);
  assert.match(entry.reassessOn, /^\d{4}-\d{2}-\d{2}$/, `互換候補の再評価日が不正です: ${entry.file}`);
}
const result = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  source: 'build/report/refactor-candidates.json',
  summary: { candidates: entries.length, retained: entries.length - safeToDelete.length, safeToDelete: safeToDelete.length },
  entries,
  policy: '参照されない候補だけを削除候補として記録し、公開境界・開発入口・検査入口は目的・参照元・削除条件・再評価日付きで保持する。'
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'compat-boundary-audit.json'), JSON.stringify(result, null, 2) + '\n');
assert.ok(result.summary.retained + result.summary.safeToDelete === result.summary.candidates);
console.log(`Compatibility boundary audit OK: candidates=${entries.length}, retained=${result.summary.retained}, safeToDelete=${result.summary.safeToDelete}.`);
