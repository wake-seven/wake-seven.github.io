import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(join(root, 'scripts', 'development-entrypoints.json'), 'utf8'));
const errors = [];
for (const [name, entry] of Object.entries(config.entrypoints || {})) {
  if (!entry.sources?.length || !entry.symbols?.length) errors.push(`${name}: sources/symbolsが空です`);
  for (const source of entry.sources || []) { try { await access(join(root, source)); } catch { errors.push(`${name}: ソースがありません: ${source}`); } }
  for (const report of [...(entry.stateReports || []), ...(entry.domReports || []), ...(entry.e2eReports || []), ...(entry.flowReports || [])]) {
    try { await access(join(root, 'build', 'report', report)); } catch { errors.push(`${name}: レポートがありません（npm run build/check後に生成）: ${report}`); }
  }
}
if (!config.commands?.trace || !config.commands?.entrypoint || !config.commands?.impact || !config.commands?.progression || !config.commands?.gate) errors.push('commandsに固定入口が不足しています');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Development entrypoints OK: ${Object.keys(config.entrypoints).length} entries`);
