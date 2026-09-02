// 進行操作の公開コマンド入口。
// 実装本体は既存ランタイムに残し、イベントや他モジュールからの
// 呼び出し経路だけをここへ集約する。
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(),
  advanceSpeedRun:()=>advanceSpeedRun(),
  // 画面イベントから進行状態へ入る唯一の入口。実装本体は既存関数を利用する。
  loadStage:index=>loadStage(index),
  loadMasteryStage:index=>loadExtraStage(index),
  loadSatoriStage:index=>loadSatoriStage(index),
  startFree:()=>startFree(),
  advanceAfterClear:()=>advanceAfterClear()
});
// 公開ネイティブモジュールの構文境界。
export {};
