import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 変更ファイルから確認範囲を選ぶ。判定を狭くしすぎないよう、迷った変更はaffectedへ昇格する。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
const changedFiles = raw.split('\0').filter(Boolean).map(entry => entry.slice(3)).filter(Boolean);
const ignoredFiles = changedFiles.filter(file => file.startsWith('build/report/'));
const files = changedFiles.filter(file => !ignoredFiles.includes(file));
const reasons = [];
let profile = 'fast';
const fullRules = [
  /^scripts\//, /^package(?:-lock)?\.json$/, /^src\/(?:state|runtime|commands)\//,
  /^src\/.*(?:progression|navigation|speed)/i, /^scripts\/application-manifest\.mjs$/,
  /^index\.html$/
];
const affectedRules = [/^src\//, /^(?:styles?|public)\//, /\.(?:css|html|svg)$/i];
const ambiguous = [];
for (const file of files) {
  if (fullRules.some(rule => rule.test(file))) {
    profile = 'full';
    reasons.push(`${file}: 構造・状態・入口・公開物に影響するためfull`);
  } else if (profile !== 'full' && affectedRules.some(rule => rule.test(file))) {
    profile = 'affected';
    reasons.push(`${file}: ソースまたは表示領域の変更のためaffected`);
  } else if (file) {
    if (profile === 'fast') profile = 'affected';
    ambiguous.push(file);
    reasons.push(`${file}: 判定規則がないため安全側のaffected`);
  }
}
if (!files.length) reasons.push('変更ファイルがないためfast');
const report = {
  schemaVersion: 1,
  name: 'wake7-check-profile-selection',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  summary: { profile, changedFileCount: files.length, ignoredReportCount: ignoredFiles.length, ambiguousCount: ambiguous.length },
  changedFiles: files,
  ignoredFiles,
  ambiguous,
  reasons,
  command: `npm run check:${profile}`,
  policy: { full: 'scripts/state/runtime/commands・manifest・主要導線・公開物の変更', affected: 'ソース・表示変更または判定不能な変更', fast: '変更なし、またはドキュメントのみ' }
};
await mkdir(reportDir, { recursive: true });
await writeFile(join(reportDir, 'check-profile-selection.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Check profile selected: ${profile} (${files.length} changed files, ${ambiguous.length} ambiguous). Report: build/report/check-profile-selection.json`);
