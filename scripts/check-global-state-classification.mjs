import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 公開ソースのトップレベル宣言を、移行対象と移行対象外が分かる用途名で分類する。
// animation/event-local は仕様上の短命値として、gateway移行の対象外であることも記録する。
const root = dirname(dirname(fileURLToPath(import.meta.url))); const categories = ['domain', 'navigation', 'dialog', 'session', 'settings', 'event-local', 'animation'];
const mask = source => source.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, match => match.includes('\n') ? match.replace(/[^\n]/g, ' ') : ' '.repeat(match.length)).replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, match => match.replace(/[^\n]/g, ' '));
const classify = (name, file, source) => {
  const text = `${name} ${file} ${source}`;
  if (/animation|animate|spin|frame|raf|transition|introRun|WelcomeRun/i.test(text)) return 'animation';
  if (/pointer|touch|drag|swipe|hover|gesture|event|pointerId|clientX|clientY/i.test(text)) return 'event-local';
  if (/dialog|message|quiz|clearFlow|chain/i.test(text)) return 'dialog';
  if (/navigation|activeMode|lastStage|stageIndex|extraIndex|satoriIndex|tutorialStep|returnStage|picker/i.test(text)) return 'navigation';
  if (/session|speed|history|savedFree|clock|resume/i.test(text)) return 'session';
  if (/setting|language|sound|theme|layout|color/i.test(text)) return 'settings';
  if (/domain|board|cell|tile|ori|roll|solver|stage|pattern|TRI|CELL/i.test(text)) return 'domain';
  // データ定数や公開境界の定数は宣言ファイルが責務を示すため、名前だけで未分類にしない。
  if (/^data\//.test(file)) return 'domain';
  if (/^runtime\/audio/.test(file)) return 'session';
  if (/^runtime\//.test(file)) return 'navigation';
  if (/^app\//.test(file)) return 'session';
  if (/^commands\//.test(file)) return 'navigation';
  if (/^ui\/progression/.test(file)) return 'navigation';
  if (/^ui\//.test(file)) return 'domain';
  return null;
};
const states = [];
for (const file of publishedSourceFiles) {
  const source = await readFile(join(root, 'src', file), 'utf8'); const text = mask(source); let depth = 0;
  for (const line of text.split('\n')) {
    const top = depth === 0 ? line.match(/\b(let|var|const)\s+([A-Za-z_$][\w$]*)/) : null;
    if (top) states.push({ name: top[2], declaration: top[1], file, category: classify(top[2], file, line), migration: /^(event-local|animation)$/.test(classify(top[2], file, line) || '') ? 'out-of-scope' : 'review' });
    for (const char of line) { if (char === '{') depth += 1; else if (char === '}') depth = Math.max(0, depth - 1); }
  }
}
const unclassified = states.filter(item => !item.category); const counts = Object.fromEntries(categories.map(category => [category, states.filter(item => item.category === category).length]));
const report = { schemaVersion: 1, name: 'wake7-global-state-classification', generatedAt: new Date().toISOString(), sourceRevision: 'working-tree', status: unclassified.length ? 'failed' : 'passed', warnings: [], errors: unclassified.map(item => `未分類global: ${item.file}:${item.name}`), summary: { declarations: states.length, unclassified: unclassified.length, counts, outOfScope: states.filter(item => item.migration === 'out-of-scope').length }, policy: { categories, excludedFromMigration: ['event-local', 'animation'], unknown: '安全側で未分類として検査を失敗させる' }, states, unclassified };
await mkdir(join(root, 'build/report'), { recursive: true }); await writeFile(join(root, 'build/report/global-state-classification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Global state classification: ${states.length} declarations, ${unclassified.length} unclassified, ${report.summary.outOfScope} event-local/animation out of scope.`);
if (unclassified.length) process.exitCode = 1;
