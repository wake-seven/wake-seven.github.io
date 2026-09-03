import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { publishedSourceFiles } from './application-manifest.mjs';

// 画面要素と、それを組み立てるデータ・表示関数の対応表を生成する。
// 手書きの対応表は作らず、公開版マニフェストと trace index を材料にする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const tracePath = join(reportDir, 'symbol-index.json');
const trace = JSON.parse(await readFile(tracePath, 'utf8'));
const sourceFiles = new Set(publishedSourceFiles);
const definitions = Object.values(trace.definitions || {});
const dom = trace.dom || {};
const sourceOf = name => {
  const item = trace.definitions?.[name];
  return item ? { file: item.file, line: item.line, name } : null;
};
const firstExisting = names => names.map(sourceOf).find(Boolean) || null;
const domRefs = ids => ids.flatMap(id => (dom[id] || []).map(ref => ({ id, file: ref.file, line: ref.line, updater: ref.updater || null })));
const existingIds = ids => ids.filter(id => Object.hasOwn(dom, id));

const entries = [
  {
    key: 'remaining-moves',
    label: 'あと○くるり / 現在手数',
    elements: existingIds(['stagePar', 'moves', 'movesLabel', 'movesUnit', 'academyRemainingCallout', 'academyRemainingCalloutNumber']),
    data: ['runtimeSnapshot', 'STAGES', 'EXTRA_STAGES', 'SATORI_STAGES'],
    renderers: ['showRemaining', 'showMoves', 'renderMovesMetric', 'showAcademyRemainingCallout']
  },
  {
    key: 'application-target',
    label: '応用クラスの目標3枚枠',
    elements: existingIds(['applicationTargetPreview', 'applicationTargetPreviewBoard', 'applicationTargetPreviewLabel', 'board']),
    data: ['STAGES', 'PROGRESSION'],
    renderers: ['renderApplicationTargetPreview', 'renderApplicationTargetCells', 'renderStageNav']
  },
  {
    key: 'clear-message',
    label: 'クリア後メッセージ',
    elements: existingIds(['clearDialog', 'clearDialogMessage', 'clearStageContext', 'clearTipIllustration', 'clearQuiz', 'clearQuizOptions']),
    data: ['CLEAR_CONTENT', 'clearContentAt', 'clearEntryForCurrent'],
    renderers: ['showClearDialog', 'renderClearStageContext', 'renderClearTip', 'renderClearQuiz', 'renderClearQuizForEntry']
  },
  {
    key: 'rank',
    label: '称号・ランク',
    elements: existingIds(['rankBadge', 'rankDialog', 'rankList', 'masterSeal', 'messageMasterSeal']),
    data: ['RANK_FRAME_COLORS', 'masterPath', 'rankForVolume'],
    renderers: ['setSealColor', 'renderRankBadge', 'renderRankList', 'openRankDialog']
  },
  {
    key: 'dialogs',
    label: 'ダイアログ連鎖',
    elements: Object.keys(dom).filter(id => /Dialog$|Overlay$/.test(id)),
    data: ['UI_TEXT', 'CLEAR_CONTENT', 'INTRO_MILESTONE_COPY'],
    renderers: ['openChainedDialog', 'showMasterDialog', 'openMessageReview', 'openIntroGuide', 'showClearDialog']
  }
];

const mapEntry = entry => ({
  key: entry.key,
  label: entry.label,
  elements: entry.elements.map(id => ({ id, references: domRefs([id]) })),
  data: entry.data.map(name => sourceOf(name) || { name, status: 'not-found' }),
  renderers: entry.renderers.map(name => firstExisting([name]) || { name, status: 'not-found' })
});
const report = {
  schemaVersion: 1,
  generatedForVersion: trace.generatedForVersion || 'unknown',
  source: { manifest: 'scripts/application-manifest.mjs:publishedSourceFiles', trace: 'build/report/symbol-index.json' },
  entries: entries.map(mapEntry),
  notes: ['要素の位置と参照は公開版マニフェストに含まれるソースから生成しています。', 'not-found は対応表の候補名が索引にないことを示し、手書きの推測ではありません。']
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'ui-data-map.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Generated UI/data map: ${relative(root, join(reportDir, 'ui-data-map.json'))}`);
