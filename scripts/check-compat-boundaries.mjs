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
  if (published.has(file)) return { disposition: '保持', reason: '公開マニフェストに含まれる単体index.htmlの構成要素' };
  if (development.has(file)) return { disposition: '保持', reason: '開発用ESM入口から利用されるモジュール' };
  const references = [...contents.entries()]
    .filter(([path, source]) => path !== `src/${file}` && source.includes(file))
    .map(([path]) => path);
  if (references.length) return { disposition: '保持', reason: 'ソースまたは検査から参照されている', references };
  return { disposition: '削除候補', reason: 'マニフェスト・開発入口・検査から参照されていない' };
};

const entries = candidateReport.candidates.map(candidate => ({
  file: candidate.file,
  classification: candidate.classification,
  ...classify(candidate)
}));
const safeToDelete = entries.filter(entry => entry.disposition === '削除候補');
const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'build/report/refactor-candidates.json',
  summary: { candidates: entries.length, retained: entries.length - safeToDelete.length, safeToDelete: safeToDelete.length },
  entries,
  policy: '参照されない候補だけを削除候補として記録し、公開境界・開発入口・検査入口は理由付きで保持する。'
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'compat-boundary-audit.json'), JSON.stringify(result, null, 2) + '\n');
assert.ok(result.summary.retained + result.summary.safeToDelete === result.summary.candidates);
console.log(`Compatibility boundary audit OK: candidates=${entries.length}, retained=${result.summary.retained}, safeToDelete=${result.summary.safeToDelete}.`);
