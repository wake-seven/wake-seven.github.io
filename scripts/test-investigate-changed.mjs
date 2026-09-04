// 変更影響調査の最小契約テスト。git状態や生成物に依存せず、分類ロジックだけを検証する。
import './investigate-changed.mjs';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/investigate-changed.mjs', '--self-test'], { stdio: 'inherit' });
