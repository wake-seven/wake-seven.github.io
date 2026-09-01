// 進行操作の公開コマンド入口。ファイル名は旧分割時の互換名だが、
// 実装本体は既存ランタイムに残し、
// イベントや他モジュールからの呼び出し経路だけをここへ集約する。
// 将来の状態ストア移行時も、呼び出し側はこのAPIを維持できる。
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(),
  advanceSpeedRun:()=>advanceSpeedRun()
});
// 公開native moduleの構文境界。
export {};
