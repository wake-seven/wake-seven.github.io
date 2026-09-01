// 進行操作の公開コマンド入口。
// 実装本体は既存ランタイムに残し、イベントや他モジュールからの
// 呼び出し経路だけをここへ集約する。
const WakeSevenProgressionCommands=Object.freeze({
  startSpeedRun:()=>beginSpeedRun(),
  advanceSpeedRun:()=>advanceSpeedRun()
});
// 公開native moduleの構文境界。
export {};
