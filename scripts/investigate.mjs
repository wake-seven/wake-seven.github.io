import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { investigateFeatures, formatInvestigation } from './lib/feature-investigation.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const json = args.includes('--json');
const fileIndex = args.indexOf('--file');
const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
const feature = args.find((arg, index) => !arg.startsWith('-') && !(fileIndex >= 0 && index === fileIndex + 1));
if (!feature && !file) {
  console.log('使い方: npm run investigate -- <feature> または npm run investigate -- --file <path>');
  process.exitCode = 1;
} else {
  try {
    const result = await investigateFeatures({ root, feature, files: file ? [file] : [] });
    if (json) console.log(JSON.stringify(result, null, 2));
    else console.log(formatInvestigation(result));
    const reportPath = join(root, 'build/report/feature-investigation.json');
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(result, null, 2) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
