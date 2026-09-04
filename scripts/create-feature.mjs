import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// feature registry の新しい項目を、既存のJSONレイアウトを保ったまま作成する。
// pathsや検査は後から埋める前提の draft を生成し、登録漏れを防ぐ入口にする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registryPath = join(root, 'scripts', 'feature-registry.json');
const args = process.argv.slice(2);

const usage = () => {
  console.log('使い方: npm run feature:new -- <name> [--path <path>] [--check <check>] [--e2e <check>]');
};

if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0); }
const name = args.find(arg => !arg.startsWith('-'));
if (!name) { usage(); process.exitCode = 1; throw new Error('機能名を指定してください。'); }
if (!/^[a-z][a-z0-9]*(?:[/-][a-z0-9]+)*$/.test(name)) {
  throw new Error(`機能名が不正です: ${name}（小文字英数字、-、/ のみ使用してください）`);
}

const values = (flag) => args.flatMap((arg, index) => {
  if (arg === flag) return args[index + 1] && !args[index + 1].startsWith('-') ? [args[index + 1]] : [];
  if (arg.startsWith(`${flag}=`)) return [arg.slice(flag.length + 1)];
  return [];
}).filter(Boolean);
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
if (!Array.isArray(registry.features)) throw new Error('feature-registry.json の features が配列ではありません。');
if (registry.features.some(feature => feature?.name === name)) throw new Error(`機能名が既に登録されています: ${name}`);

const paths = values('--path');
const checks = values('--check');
const relatedE2E = values('--e2e');
const entry = { name, status: 'draft', paths, checks, relatedE2E };
const source = await readFile(registryPath, 'utf8');
const marker = '\n  ],\n  "policy":';
const markerIndex = source.indexOf(marker);
if (markerIndex < 0) throw new Error('features配列の挿入位置を特定できません。');
const before = source.slice(0, markerIndex);
const insertion = `,\n    ${JSON.stringify(entry)}`;
const next = `${before}${insertion}${source.slice(markerIndex)}`;
await writeFile(registryPath, next);
console.log(`Feature draft created: ${name}`);
console.log('paths/checks/relatedE2Eを埋めてから、npm run check:feature-registry を実行してください。');
