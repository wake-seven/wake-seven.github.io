import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'src', 'ui', 'board-ui.js'), 'utf8');
const events = await readFile(join(root, 'src', 'runtime', 'app-events.js'), 'utf8');
const runtime = await readFile(join(root, 'src', 'runtime', 'runtime.js'), 'utf8');
const progressionUi = await readFile(join(root, 'src', 'ui', 'progression-ui.js'), 'utf8');
const progressionDialogs = await readFile(join(root, 'src', 'ui', 'progression-dialogs.js'), 'utf8');
const rank = await readFile(join(root, 'src', 'ui', 'rank.js'), 'utf8');
const template = await readFile(join(root, 'src', 'index.template.html'), 'utf8');

// ステージ選択・称号一覧・ヘッダーの入口は、個別描画関数を直接呼ばず
// 共通の openDialog に集約する。ここで経路の接続を静的に固定する。
required(/function openDialog\(dialogId, options=\{\}\)/, '共通 openDialog 入口がありません。', progressionDialogs);
required(/dialogId==='stagePicker'[\s\S]{0,500}openStagePickerAt[\s\S]{0,300}openStagePicker/, 'openDialog のステージ選択経路が不正です。', progressionDialogs);
required(/dialogId==='rankDialog'[\s\S]{0,180}openRankDialog/, 'openDialog の称号一覧経路が不正です。', progressionDialogs);
required(/menuStagePicker[\s\S]{0,120}openDialog\('stagePicker'\)/, 'メニューのステージ選択が共通入口を使っていません。', events);
required(/stagePickerTrigger[\s\S]{0,100}openDialog\('stagePicker'\)/, 'ヘッダーのステージ選択が共通入口を使っていません。', events);
required(/stagePickerRankBadge[\s\S]{0,220}openDialog\('rankDialog'/, 'ステージ選択内の称号一覧が共通入口を使っていません。', events);
required(/rankBadge[\s\S]{0,100}openDialog\('rankDialog'\)/, 'ヘッダーの称号一覧が共通入口を使っていません。', events);
required(/openDialog\('stagePicker',\{lap:/, '称号一覧からステージ選択への経路が共通入口を使っていません。', rank);

function required(pattern, message, text = source) {
  assert.match(text, pattern, message);
}

// 連鎖は共有ダイアログの登録表を入口にする。名前を直接条件分岐へ
// 増やしてしまう退行や、登録漏れによる空ダイアログを検出する。
const chainBlock = source.match(/const CHAIN_STEPS=\{([\s\S]*?)\n\};\n\/\/ CHAIN_STEPS/);
assert.ok(chainBlock, 'CHAIN_STEPS registry is missing.');
const chainNames = [...chainBlock[1].matchAll(/^ {2}(?! )([A-Za-z_$][\w$]*):/gm)].map(match => match[1]);
const expectedNames = [
  'academyEnroll', 'academyWelcome', 'basicWelcome', 'applicationWelcome', 'developmentWelcome',
  'developmentFourStart', 'trainingWelcome', 'trainingUpperPractice',
  'trainingUpperGoal', 'trainingMiddleSpin', 'trainingMiddleGoal', 'trainingLowerGoal'
];
assert.deepEqual(chainNames, expectedNames, 'CHAIN_STEPS order or membership changed unexpectedly.');

for (const name of expectedNames) {
  const step = chainBlock[1].match(new RegExp(`^  (?! )${name}:[\\s\\S]*?(?=^  (?! )[A-Za-z_$][\\w$]*:|(?![\\s\\S]))`, 'm'));
  assert.ok(step, `CHAIN_STEPS entry is missing: ${name}`);
  if (['academyWelcome', 'basicWelcome', 'applicationWelcome'].includes(name)) {
    assert.match(step[0], /academyBoardStep\(/, 'Basic welcome must use the shared academy board step renderer.');
    continue;
  }
  assert.match(step[0], /titleKey\s*:/, `Chain step title is missing: ${name}`);
  assert.match(step[0], /actionKey\s*:/, `Chain step action is missing: ${name}`);
  assert.match(step[0], /render\s*[:(]/, `Chain step renderer is missing: ${name}`);
  assert.match(step[0], /onAction\s*\(/, `Chain step action handler is missing: ${name}`);
}

// 代表的な開始連鎖。上巻は説明→実演→出題、中巻は説明→回転実演→出題の順を固定する。
for (const [from, to] of [
  ['academyEnroll', 'academyWelcome'],
  ['trainingWelcome', 'trainingUpperGoal'],
  ['trainingUpperGoal', 'trainingUpperPractice'],
  ['trainingMiddleGoal', 'trainingMiddleSpin']
]) {
  required(new RegExp(from + "[\\s\\S]{0,700}(?:openChainedDialog\\('" + to + "'\\)|requestProgressionDialog\\('chain',\\{name:'" + to + "'\\})"), `${from} must lead to ${to}.`);
}
// 上巻・中巻の実演から本編へ戻ることも、連鎖を閉じたままにしない重要契約。
required(/trainingUpperPractice[\s\S]{0,1800}loadStage\(TRAINING_STAGE_START\)/, 'Upper-volume practice must enter the first stage.');
required(/trainingMiddleSpin[\s\S]{0,1800}loadStage\(TRAINING_STAGE_START\+TRAINING_UPPER_COUNT\)/, 'Middle-volume practice must enter the first stage.');

// 連鎖開始地点が登録表を経由していることを確認する。
for (const name of ['academyEnroll', 'basicWelcome', 'applicationWelcome', 'developmentWelcome']) {
  assert.match(events + source + progressionUi, new RegExp(`(?:openChainedDialog\\('${name}'\\)|requestProgressionDialog\\('chain',\\{name:'${name}'\\})`), `Chain entry is not connected: ${name}`);
}
required(/state\.id==='chain'&&CHAIN_STEPS\[state\.name\][\s\S]{0,120}openChainedDialog\(state\.name\)/, 'Saved chain dialog must restore through CHAIN_STEPS.', runtime);

// 前へは履歴がある時だけ表示し、次へで履歴を積む。cleanup は次の描画・閉じるの
// どちらでも呼ばれるため、アニメーションが次のステップへ漏れないことを監査する。
required(/chainHistory\.push\(name\)[\s\S]{0,240}closeChainDialog\(\)[\s\S]{0,240}step\.onAction\(\)/, 'Chain next action must close and transition with history.', events);
required(/chainHistory\.pop\(\)[\s\S]{0,100}openChainedDialog\(previous\)/, 'Chain previous action must restore the prior step.', events);
required(/previous\.hidden=chainHistory\.length===0/, 'Chain previous button must be hidden at the beginning.');
required(/if\(chainCleanup\)\{chainCleanup\(\);chainCleanup=null;\}/, 'Chain renderer cleanup must run before replacement.', source);
required(/chainCleanup=step\.render\(\$\('chainDialogBody'\)\)\|\|null/, 'Chain renderer cleanup must be registered.', source);
required(/\$\('chainDialogAction'\).*addEventListener\('click'/, 'Chain next button binding is missing.', events);
required(/\$\('chainDialogPrev'\).*addEventListener\('click'/, 'Chain previous button binding is missing.', events);

for (const id of ['chainDialog', 'chainDialogPrev', 'chainDialogAction', 'chainDialogBody']) {
  assert.match(template, new RegExp(`id=["']${id}["']`), `Chain dialog DOM contract is missing: ${id}`);
}

console.log(`Dialog chain audit passed: ${expectedNames.length} CHAIN_STEPS, upper/middle start chains, navigation, cleanup, and restore contracts.`);
