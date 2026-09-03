import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 固定入口から、関連ソース・状態・DOM・E2E・生成レポートを一覧化する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(join(root, 'scripts', 'development-entrypoints.json'), 'utf8'));
const name = process.argv[2];
if (!name || process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('使い方: npm run trace:entry -- <progression|state|clear-flow> [--json]');
  process.exit(name ? 0 : 1);
}
const entry = config.entrypoints[name];
if (!entry) throw new Error(`未知の開発入口です: ${name}`);
const result = { schemaVersion: 1, name: 'wake7-development-entrypoint', entrypoint: name, label: entry.label,
  generatedAt: new Date().toISOString(), sources: entry.sources, symbols: entry.symbols,
  reports: [...new Set([...entry.stateReports, ...entry.domReports, ...entry.e2eReports, ...entry.flowReports])],
  commands: config.commands };
const reportPath = join(root, 'build', 'report', `entrypoint-${name}.json`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`開発入口: ${entry.label} (${name})`);
  console.log(`ソース: ${entry.sources.join(', ')}`);
  console.log(`主要入口: ${entry.symbols.join(', ')}`);
  console.log(`状態: ${entry.stateReports.join(', ')}`);
  console.log(`DOM: ${entry.domReports.join(', ')}`);
  console.log(`E2E: ${entry.e2eReports.join(', ')}`);
  console.log(`フロー: ${entry.flowReports.join(', ')}`);
  console.log(`索引: ${relative(root, reportPath)}`);
  console.log(`次の検索: ${config.commands.trace}`);
}
