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

// 公開ネイティブモジュールの構文境界。
export {};
