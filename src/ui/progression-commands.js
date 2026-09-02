// 進行画面から呼び出す公開コマンドの名前空間。
// 描画や状態計算とは分離し、イベント配線が参照する入口だけを束ねる。
const GameNavigation=Object.freeze({
  tutorial:()=>startTutorial(),
  stage:index=>loadStage(index),
  mastery:index=>loadExtraStage(index),
  satori:index=>loadSatoriStage(index),
  free:()=>startFree(),
  maker:()=>enterBoardMaker(),
  stageMenu:()=>returnToStageMode(),
  speedPicker:()=>openSpeedPicker()
});
const GameDialogs=Object.freeze({
  messages:options=>openMessageReview(options),
  ranks:options=>openRankDialog(options),
  mastery:kind=>showMasterDialog(kind)
});

// 進行状態を変更する公開コマンドも、進行画面の入口としてここにまとめる。
// 実装本体は runtime.js / speed.js に残し、イベント配線からの入口だけを束ねる。
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(),
  advanceSpeedRun:()=>advanceSpeedRun(),
  loadStage:index=>loadStage(index),
  loadMasteryStage:index=>loadExtraStage(index),
  loadSatoriStage:index=>loadSatoriStage(index),
  startFree:()=>startFree(),
  advanceAfterClear:()=>advanceAfterClear()
});

// 公開ネイティブモジュールの構文境界。
export {};
