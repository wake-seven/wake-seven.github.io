// 進行操作のコマンド入口。実装本体は既存ランタイムに残し、
// イベントや他モジュールからの呼び出し経路だけをここへ集約する。
// 将来の状態ストア移行時も、呼び出し側はこのAPIを維持できる。
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(),
  advanceSpeedRun:()=>advanceSpeedRun()
});
