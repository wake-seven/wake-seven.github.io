import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, 'src', 'index.template.html');
const stateModulePath = join(root, 'src', 'game-state.js');
const outputPath = join(root, 'index.html');
const start = '<!-- WAKE7:STATE-MODULE:START -->';
const end = '<!-- WAKE7:STATE-MODULE:END -->';

const [template, stateModule] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(stateModulePath, 'utf8')
]);

const startAt = template.indexOf(start);
const endAt = template.indexOf(end);
if (startAt < 0 || endAt < 0 || endAt <= startAt) {
  throw new Error('State-module markers are missing from src/index.template.html.');
}

const generated = `${template.slice(0, startAt + start.length)}\n<script>\n${stateModule.trim()}\n</script>\n${template.slice(endAt)}`;
await writeFile(outputPath, generated, 'utf8');
console.log('Built index.html from src/index.template.html');
