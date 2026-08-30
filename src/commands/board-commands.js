// 盤面操作のコマンド入口。実装本体は当面 board-ui.js に残し、入力経路だけを統一する。
// options をオブジェクト化しておくことで、将来の状態ストア移行時に呼び出し側を変えずに済む。
const WakeSevenBoardCommands=Object.freeze({
  applySwipe:(ti,dir,options={})=>applySwipe(ti,dir,options.save??true,options.playEffects??true),
  undo:()=>undoLastMove()
});
// 公開native moduleの構文境界。
export {};
