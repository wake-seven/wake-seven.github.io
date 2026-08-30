import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, 'src', 'index.template.html');
const stateModulePath = join(root, 'src', 'game-state.js');
const progressionModulePath = join(root, 'src', 'progression-policy.js');
const appModuleFiles = ['data-clear-content.js', 'core-data.js', 'data-ui-text.js', 'data-board-quiz.js', 'runtime.js', 'speed-runtime.js', 'board-animation.js', 'board-ui.js', 'quiz-ui.js', 'clear-flow.js', 'message-ui.js', 'progression-render.js', 'progression-ui.js', 'app-events.js'];
const outputPath = join(root, 'index.html');
const start = '<!-- WAKE7:STATE-MODULE:START -->';
const end = '<!-- WAKE7:STATE-MODULE:END -->';
const progressionStart = '<!-- WAKE7:PROGRESSION-POLICY:START -->';
const progressionEnd = '<!-- WAKE7:PROGRESSION-POLICY:END -->';
const appStart = '<!-- WAKE7:APPLICATION-MODULES:START -->';
const appEnd = '<!-- WAKE7:APPLICATION-MODULES:END -->';

const [template, stateModule, progressionModule, ...appModules] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(stateModulePath, 'utf8'),
  readFile(progressionModulePath, 'utf8'),
  ...appModuleFiles.map(file => readFile(join(root, 'src', file), 'utf8'))
]);
function inject(source,startMarker,endMarker,module,name) {
  const startAt = source.indexOf(startMarker);
  const endAt = source.indexOf(endMarker);
  if(startAt < 0 || endAt < 0 || endAt <= startAt) throw new Error(`${name} markers are missing from src/index.template.html.`);
  return `${source.slice(0,startAt + startMarker.length)}\n<script>\n${module.trim()}\n</script>\n${source.slice(endAt)}`;
}
const withState = inject(template,start,end,stateModule,'State-module');
const withProgression = inject(withState,progressionStart,progressionEnd,progressionModule,'Progression-policy');
const moduleLabels = ['クリア後メッセージデータ', '基礎データ', '多言語UIテキスト', '盤面クイズデータ', '実行状態', 'スピードランランタイム', '盤面アニメーション補助', '盤面UI', 'クイズUI', 'クリアフロー', 'メッセージUI', '進行表示', '進行UI', 'イベントと起動'];
const generated = inject(
  withProgression,
  appStart,
  appEnd,
  appModules.map((module,index) => `// ===== ${moduleLabels[index]} =====\n${module.trim()}`).join('\n\n'),
  'Application-modules'
);
await writeFile(outputPath, generated, 'utf8');
console.log('Built index.html from src/index.template.html');
