import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applicationModuleFiles, progressionPolicyFiles, stateModuleFiles } from './application-manifest.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(root, 'src', 'index.template.html');
const stateModulePath = join(root, 'src', stateModuleFiles[0]);
const progressionModulePath = join(root, 'src', progressionPolicyFiles[0]);
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
  ...applicationModuleFiles.map(file => readFile(join(root, 'src', file), 'utf8'))
]);
function inject(source,startMarker,endMarker,module,name) {
  const startAt = source.indexOf(startMarker);
  const endAt = source.indexOf(endMarker);
  if(startAt < 0 || endAt < 0 || endAt <= startAt) throw new Error(`${name} markers are missing from src/index.template.html.`);
  // The generated artifact is a single native module script.  Source files
  // are concatenated directly so CSP can forbid eval/Function entirely.
  return `${source.slice(0,startAt + startMarker.length)}\n<script type="module">\n${module.trim()}\n</script>\n${source.slice(endAt)}`;
}
const moduleLabels = ['盤面ドメイン', 'クリア後メッセージデータ', '基礎データ', '悟り出題データ', '多言語UIテキスト', '盤面クイズデータ', '固定挿絵・SVGデータ', '実行設定', 'サウンド', '速解き解放状態', '実行状態', 'スピードランランタイム', '盤面アニメーション補助', '盤面座標変換', '盤面UI', '盤面renderer', '盤面コマンド', '進行コマンド', '設定コマンド', '進行command', 'クイズUI', 'クリアフロー', 'メッセージUI', '進行表示', '節目ダイアログ', '進行UI', 'ロードマップ表示', 'ヒント表示', 'クリア後遷移', '進行ナビゲーション', 'SVG表示境界', '画面描画境界', 'イベントと起動', '起動・ライフサイクル', '公開API名前空間'];
const applicationModule = appModules
  .map((module,index) => `// ===== ${moduleLabels[index] || applicationModuleFiles[index]} =====\n${module.trim()}`)
  .join('\n\n');

// 公開版は1本のnative module scriptにまとめる。CSP互換性を保つため、
// evalやFunctionによる実行ブリッジは使わず、ソースを直接連結する。
const combinedPayload = [
  `// ${start}\n${stateModule.trim()}`,
  `// ${progressionStart}\n${progressionModule.trim()}`,
  applicationModule
].join('\n\n');
function clearModuleBlock(source, blockStart, blockEnd) {
  const startAt = source.indexOf(blockStart), endAt = source.indexOf(blockEnd);
  if (startAt < 0 || endAt < 0 || endAt <= startAt) throw new Error('Build markers are missing.');
  return `${source.slice(0, startAt + blockStart.length)}\n${source.slice(endAt)}`;
}
const cleared = clearModuleBlock(clearModuleBlock(template, start, end), progressionStart, progressionEnd);
const generated = inject(cleared, appStart, appEnd, combinedPayload, 'Application-modules');
await writeFile(outputPath, generated, 'utf8');
console.log('Built index.html from src/index.template.html');
