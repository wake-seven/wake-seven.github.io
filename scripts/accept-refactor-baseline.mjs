import { copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 意図した構造変更を、レビュー済みの比較基準として明示的に採用する。
// 通常の check ではこの処理を呼ばず、基準値が自動で動かないようにする。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(root, 'build', 'report');
await copyFile(join(reportDir, 'current-refactor-baseline.json'), join(reportDir, 'refactor-baseline.json'));
console.log('Accepted current refactor baseline as the next comparison baseline.');
