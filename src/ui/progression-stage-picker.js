// ステージ選択ダイアログの公開入口。
// 実装本体が段階的に移行する間も、呼び出し側はこの関数だけを使う。
function closeStagePicker(){
  closeStagePickerCore();
}
