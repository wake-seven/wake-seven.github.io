import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// 公開入口と内部検査の分類が、package.jsonと一致しているかを検査する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(root, 'package.json');
const configPath = join(root, 'scripts', 'check-entry-groups.json');
const reportPath = join(root, 'build', 'report', 'check-entry-groups.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
const config = JSON.parse(await readFile(configPath, 'utf8'));
const errors = [];
const publicNames = new Set();
for (const entry of config.publicEntries || []) {
  if (!/^check:(structure|state|flows|browser)$/.test(entry.name)) errors.push(`公開入口名が不正です: ${entry.name}`);
  if (publicNames.has(entry.name)) errors.push(`公開入口が重複しています: ${entry.name}`);
  publicNames.add(entry.name);
  if (packageJson.scripts?.[entry.name] !== entry.command) errors.push(`公開入口のpackage.json定義が不一致です: ${entry.name}`);
  for (const check of entry.checks || []) {
    if (!packageJson.scripts?.[check]) errors.push(`内部検査がpackage.jsonにありません: ${check}`);
  }
}
if (publicNames.size !== 4) errors.push(`公開入口は4領域必要です（現在${publicNames.size}領域）`);
const internalNames = new Set(config.internalChecks || []);
for (const name of internalNames) if (!packageJson.scripts?.[name]) errors.push(`内部検査がpackage.jsonにありません: ${name}`);
for (const entry of config.publicEntries || []) for (const check of entry.checks || []) if (!internalNames.has(check)) errors.push(`内部検査一覧から漏れています: ${check}`);
for (const alias of config.legacyAliases || []) {
  if (!packageJson.scripts?.[alias.name]) errors.push(`legacy aliasがpackage.jsonにありません: ${alias.name}`);
  if (!alias.replacement || !alias.removeWhen) errors.push(`legacy aliasに移行先・削除条件がありません: ${alias.name}`);
}
const report = { schemaVersion: 1, name: 'wake7-check-entry-groups', generatedAt: new Date().toISOString(), publicEntries: [...publicNames], internalChecks: [...internalNames], legacyAliases: config.legacyAliases || [], errors, warnings: [], passed: errors.length === 0 };
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
if (errors.length) { console.error(errors.join('\n')); console.error(`Report: ${relative(root, reportPath)}`); process.exitCode = 1; }
else console.log(`Check entry groups OK: ${publicNames.size} public entries, ${internalNames.size} internal checks`);
