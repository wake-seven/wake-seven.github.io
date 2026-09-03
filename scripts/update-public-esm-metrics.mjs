import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBundleMetrics } from './public-bundle-metrics.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const baselinePath = join(root, 'scripts', 'public-esm-metrics.json');
const reasonIndex = process.argv.indexOf('--reason');
const reason = reasonIndex >= 0 ? process.argv[reasonIndex + 1] : '';
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: npm run metrics:update -- --reason "why the public bundle changed"');
  console.log('Updates the checked-in public ESM metrics baseline after before/after validation.');
  process.exit(0);
}
if (!reason || reason.startsWith('--')) {
  console.error('Usage: npm run metrics:update -- --reason "why the public bundle changed"');
  process.exit(2);
}

// 明示的な大規模変更だけをbaselineへ反映する。更新前後に同じ監査を行う。
execFileSync(process.execPath, [join(root, 'scripts', 'check-public-esm.mjs')], { cwd: root, stdio: 'inherit' });
const html = await readFile(join(root, 'index.html'), 'utf8');
const startMarker = '<!-- WAKE7:APPLICATION-MODULES:START -->';
const endMarker = '<!-- WAKE7:APPLICATION-MODULES:END -->';
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker);
if (start < 0 || end <= start) throw new Error('Generated application markers are missing. Run npm run build first.');
const application = html.slice(start + startMarker.length, end);
const scripts = [...application.matchAll(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi)];
if (scripts.length !== 1) throw new Error(`Expected one bundled application script, found ${scripts.length}.`);
const script = scripts[0][0];
const globalNames = [...new Set([...script.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(([, name]) => name))];
const nextMetrics = extractBundleMetrics({ script, template: await readFile(join(root, 'src', 'index.template.html'), 'utf8'), globalNames });
const previous = await readFile(baselinePath, 'utf8');
await writeFile(baselinePath, `${JSON.stringify(nextMetrics, null, 2)}\n`);
try {
  execFileSync(process.execPath, [join(root, 'scripts', 'check-public-esm.mjs')], { cwd: root, stdio: 'inherit' });
} catch (error) {
  await writeFile(baselinePath, previous);
  throw error;
}
console.log(`Updated public ESM metrics baseline for: ${reason}`);
