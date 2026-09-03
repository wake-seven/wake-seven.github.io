import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedSourceFiles } from './application-manifest.mjs';

// 主要操作要素のイベント配線を、現行ソースから機械的に索引化する。
// 固定の対応表を手書きせず、公開ソースと生成済みHTMLのIDを材料にする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(root, 'src');
const reportDir = join(root, 'build', 'report');
const sources = await Promise.all(publishedSourceFiles.map(async file => ({ file, text: await readFile(join(sourceRoot, file), 'utf8') })));
const html = await readFile(join(root, 'index.html'), 'utf8');
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const idsInHtml = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));

const targets = [
  { key: 'stage-picker', label: 'ステージ選択', ids: ['stagePickerTrigger', 'menuStagePicker', 'stagePickerRankBadge', 'closeStagePicker'], display: ['stagePicker', 'stagePickerGrid'] },
  { key: 'rank-list', label: '称号一覧', ids: ['rankBadge', 'menuRankList', 'stagePickerRankBadge', 'closeRankDialog'], display: ['rankDialog', 'rankList'] },
  { key: 'menu', label: 'メニュー', ids: ['menuToggle', 'menuStagePicker', 'menuRankList', 'menuSettings', 'menuSpeed'], display: ['appMenu', 'menuStagePicker', 'menuRankList', 'menuSettings', 'menuSpeed'] },
  { key: 'clear-dialog', label: 'クリア後操作', ids: ['clearNext', 'clearClose'], display: ['clearDialog'] },
  { key: 'speed-run', label: '速解き開始・再開', ids: ['speedBoardStart', 'speedResume', 'masterStart'], display: ['speedStartOverlay', 'speedPauseDialog', 'speedRestartDialog'] }
];

const findRegistrations = id => {
  const matches = [];
  for (const source of sources) {
    const patterns = [
      { kind: 'binding', regex: new RegExp(`WakeSevenEventBindings\\.(click|on)\\(\\s*['"]${id}['"]`, 'g') },
      { kind: 'direct', regex: new RegExp(`(?:\\$|getElementById)\\(\\s*['"]${id}['"]\\s*\\)[^\\n;]{0,160}\\.addEventListener\\(\\s*['"]([^'"]+)['"]`, 'g') }
    ];
    for (const { kind, regex: pattern } of patterns) {
      let match;
      while ((match = pattern.exec(source.text))) {
        const end = Math.min(source.text.length, match.index + 1800);
        const context = source.text.slice(match.index, end);
        const calls = [...context.matchAll(/(?:GameDialogs\.([A-Za-z_$][\w$]*)|\b(open[A-Za-z_$]*|show[A-Za-z_$]*|advance[A-Za-z_$]*|close[A-Za-z_$]*|resume[A-Za-z_$]*|start[A-Za-z_$]*|enter[A-Za-z_$]*)\s*\()/g)]
          .map(item => item[1] || item[2]).filter(Boolean);
        const displayIds = [...context.matchAll(/\$\(\s*['"]([^'"]+)['"]|getElementById\(\s*['"]([^'"]+)['"]|querySelector\(\s*['"]#([^'"]+)/g)]
          .map(item => item[1] || item[2] || item[3]).filter(Boolean);
        matches.push({ file: source.file, line: lineOf(source.text, match.index), registration: kind === 'binding' ? match[1] : 'addEventListener', type: kind === 'binding' ? (match[1] === 'on' ? 'multiple' : 'click') : match[1], handlers: [...new Set(calls)], displayTargets: [...new Set(displayIds)], sourceSnippet: source.text.slice(match.index, Math.min(source.text.length, match.index + 240)).replace(/\s+/g, ' ').trim() });
      }
    }
  }
  return [...new Map(matches.map(item => [JSON.stringify(item), item])).values()];
};

const entries = targets.map(target => ({
  key: target.key,
  label: target.label,
  elements: target.ids.map(id => ({ id, existsInPublishedHtml: idsInHtml.has(id), events: findRegistrations(id) })),
  displayTargets: target.display.map(id => ({ id, existsInPublishedHtml: idsInHtml.has(id) }))
}));
const missingEvents = entries.flatMap(entry => entry.elements.filter(element => element.existsInPublishedHtml && element.events.length === 0).map(element => ({ key: entry.key, id: element.id })));
const unknownDisplayTargets = entries.flatMap(entry => entry.elements.flatMap(element => element.events.flatMap(event => event.displayTargets.filter(id => !idsInHtml.has(id)).map(id => ({ key: entry.key, sourceId: element.id, id })))));
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'scripts/application-manifest.mjs:publishedSourceFiles + index.html', entries, missingEvents, unknownDisplayTargets, passed: missingEvents.length === 0 && unknownDisplayTargets.length === 0 };
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'event-wiring-map.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Generated event wiring map: ${relative(root, join(reportDir, 'event-wiring-map.json'))}`);
