// 進行処理を調べるときに最初に見る公開入口と、その実装名。
// 実装関数の名前を変更しても、ここを更新すれば追跡レポートに反映される。
export const progressionEntryPoints = Object.freeze([
  { name: 'showProgressionDialog', implementation: 'requestProgressionDialog', role: '進行ダイアログを表示する' },
  { name: 'advanceAfterClear', implementation: 'advanceAfterClear', role: 'クリア後の進行先へ移る' },
  { name: 'startStage', implementation: 'loadStage', role: '通常ステージを開始する' },
  { name: 'finishStage', implementation: 'completeBoard', role: '盤面クリアを確定する' },
  { name: 'returnToMenu', implementation: 'returnToStageMode', role: '進行メニューへ戻る' }
]);
